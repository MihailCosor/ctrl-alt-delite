import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const collection = await getTransactionsCollection();

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate && startTime && endTime) {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);
      dateFilter = {
        processed_at: {
          $gte: startDateTime,
          $lte: endDateTime
        }
      };
    }

    // Get fraud categories data
    const fraudCategories = await collection.aggregate([
      {
        $match: { 
          classification: 1, // Only fraud transactions
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$transaction.category",
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: "$transaction.amt" } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
          totalAmount: { $round: ["$totalAmount", 2] }
        }
      }
    ]).toArray();

    // Get age demographics data with fraud probabilities
    const ageDemographics = await collection.aggregate([
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), { $dateFromString: { dateString: "$transaction.dob" } }] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      {
        $match: {
          ...dateFilter,
          age: { $gte: 0, $lte: 120 } // Filter out invalid ages
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 18, 25, 35, 45, 55, 65, 100],
          default: "Unknown",
          output: {
            totalTransactions: { $sum: 1 },
            fraudTransactions: {
              $sum: { $cond: [{ $eq: ["$classification", 1] }, 1, 0] }
            },
            normalTransactions: {
              $sum: { $cond: [{ $eq: ["$classification", 0] }, 1, 0] }
            },
            totalAmount: { $sum: { $toDouble: "$transaction.amt" } },
            fraudAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$classification", 1] },
                  { $toDouble: "$transaction.amt" },
                  0
                ]
              }
            },
            avgAge: { $avg: "$age" }
          }
        }
      },
      {
        $project: {
          _id: 0,
          ageRange: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "Under 18" },
                { case: { $eq: ["$_id", 18] }, then: "18-24" },
                { case: { $eq: ["$_id", 25] }, then: "25-34" },
                { case: { $eq: ["$_id", 35] }, then: "35-44" },
                { case: { $eq: ["$_id", 45] }, then: "45-54" },
                { case: { $eq: ["$_id", 55] }, then: "55-64" },
                { case: { $eq: ["$_id", 65] }, then: "65+" },
                { case: { $eq: ["$_id", "Unknown"] }, then: "Unknown" }
              ],
              default: "Unknown"
            }
          },
          totalTransactions: 1,
          fraudTransactions: 1,
          normalTransactions: 1,
          fraudProbability: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$fraudTransactions", "$totalTransactions"] },
                  100
                ]
              },
              2
            ]
          },
          totalAmount: { $round: ["$totalAmount", 2] },
          fraudAmount: { $round: ["$fraudAmount", 2] },
          avgAge: { $round: ["$avgAge", 1] }
        }
      },
      {
        $sort: { fraudProbability: -1 }
      }
    ]).toArray();

    // Get merchant fraud vs normal transaction statistics
    const merchantStats = await collection.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: "$transaction.merchant",
          totalTransactions: { $sum: 1 },
          fraudTransactions: {
            $sum: { $cond: [{ $eq: ["$classification", 1] }, 1, 0] }
          },
          normalTransactions: {
            $sum: { $cond: [{ $eq: ["$classification", 0] }, 1, 0] }
          },
          avgFraudAmount: {
            $avg: {
              $cond: [
                { $eq: ["$classification", 1] },
                { $toDouble: "$transaction.amt" },
                null
              ]
            }
          },
          avgNormalAmount: {
            $avg: {
              $cond: [
                { $eq: ["$classification", 0] },
                { $toDouble: "$transaction.amt" },
                null
              ]
            }
          },
          totalFraudAmount: {
            $sum: {
              $cond: [
                { $eq: ["$classification", 1] },
                { $toDouble: "$transaction.amt" },
                0
              ]
            }
          },
          totalNormalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$classification", 0] },
                { $toDouble: "$transaction.amt" },
                0
              ]
            }
          }
        }
      },
      {
        $match: {
          fraudTransactions: { $gt: 0 },
          normalTransactions: { $gt: 0 }
        }
      },
      {
        $addFields: {
          fraudRate: {
            $multiply: [
              { $divide: ["$fraudTransactions", "$totalTransactions"] },
              100
            ]
          },
          amountDifference: {
            $subtract: ["$avgFraudAmount", "$avgNormalAmount"]
          },
          amountDifferencePercent: {
            $multiply: [
              { $divide: ["$amountDifference", "$avgNormalAmount"] },
              100
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          merchant: "$_id",
          totalTransactions: 1,
          fraudTransactions: 1,
          normalTransactions: 1,
          fraudRate: { $round: ["$fraudRate", 2] },
          avgFraudAmount: { $round: ["$avgFraudAmount", 2] },
          avgNormalAmount: { $round: ["$avgNormalAmount", 2] },
          amountDifference: { $round: ["$amountDifference", 2] },
          amountDifferencePercent: { $round: ["$amountDifferencePercent", 2] },
          totalFraudAmount: { $round: ["$totalFraudAmount", 2] },
          totalNormalAmount: { $round: ["$totalNormalAmount", 2] }
        }
      },
      {
        $sort: { fraudRate: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Get transaction amount ranges
    const amountRanges = await collection.aggregate([
      {
        $match: { 
          classification: 1, // Only fraud transactions
          ...dateFilter
        }
      },
      {
        $bucket: {
          groupBy: { $toDouble: "$transaction.amt" },
          boundaries: [0, 10, 50, 100, 500, 1000, 5000, 10000],
          default: "High",
          output: {
            count: { $sum: 1 },
            avgAmount: { $avg: { $toDouble: "$transaction.amt" } }
          }
        }
      },
      {
        $project: {
          _id: 0,
          range: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "$0-10" },
                { case: { $eq: ["$_id", 10] }, then: "$10-50" },
                { case: { $eq: ["$_id", 50] }, then: "$50-100" },
                { case: { $eq: ["$_id", 100] }, then: "$100-500" },
                { case: { $eq: ["$_id", 500] }, then: "$500-1K" },
                { case: { $eq: ["$_id", 1000] }, then: "$1K-5K" },
                { case: { $eq: ["$_id", 5000] }, then: "$5K-10K" },
                { case: { $eq: ["$_id", "High"] }, then: "$10K+" }
              ],
              default: "Unknown"
            }
          },
          count: 1,
          avgAmount: { $round: ["$avgAmount", 2] }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Get time-based fraud patterns
    const timePatterns = await collection.aggregate([
      {
        $addFields: {
          hour: { $hour: "$processed_at" },
          dayOfWeek: { $dayOfWeek: "$processed_at" }
        }
      },
      {
        $match: {
          classification: 1, // Only fraud transactions
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            hour: "$hour",
            dayOfWeek: "$dayOfWeek"
          },
          fraudCount: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: "$transaction.amt" } }
        }
      },
      {
        $sort: { fraudCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          hour: "$_id.hour",
          dayOfWeek: "$_id.dayOfWeek",
          fraudCount: 1,
          totalAmount: { $round: ["$totalAmount", 2] },
          timeLabel: {
            $concat: [
              { $toString: "$_id.hour" },
              ":00 - ",
              { $toString: { $add: ["$_id.hour", 1] } },
              ":00"
            ]
          }
        }
      }
    ]).toArray();

    return NextResponse.json({
      fraudCategories,
      ageDemographics,
      merchantStats,
      amountRanges,
      timePatterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
