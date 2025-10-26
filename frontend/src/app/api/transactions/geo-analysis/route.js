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
    
    // Get top 10 cities with fraud
    const topCitiesWithFraud = await collection.aggregate([
      {
        $match: { 
          classification: 1, // Only fraud transactions
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            city: "$transaction.city",
            state: "$transaction.state"
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
          city: "$_id.city",
          state: "$_id.state",
          fraudCount: 1,
          totalAmount: { $round: ["$totalAmount", 2] }
        }
      }
    ]).toArray();

    // Get top 10 countries/states with fraud (using state as country for this dataset)
    const topCountriesWithFraud = await collection.aggregate([
      {
        $match: { 
          classification: 1, // Only fraud transactions
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$transaction.state",
          fraudCount: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: "$transaction.amt" } },
          cities: { $addToSet: "$transaction.city" }
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
          country: "$_id",
          fraudCount: 1,
          totalAmount: { $round: ["$totalAmount", 2] },
          cityCount: { $size: "$cities" }
        }
      }
    ]).toArray();

    // Get all countries/states that had fraud for map coloring
    const fraudCountries = await collection.aggregate([
      {
        $match: { 
          classification: 1,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$transaction.state",
          fraudCount: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: "$transaction.amt" } },
          affectedCities: { $addToSet: "$transaction.city" }
        }
      },
      {
        $project: {
          country: "$_id",
          fraudCount: 1,
          totalAmount: { $round: ["$totalAmount", 2] },
          affectedCitiesCount: { $size: "$affectedCities" }
        }
      }
    ]).toArray();

    return NextResponse.json({
      topCities: topCitiesWithFraud,
      topCountries: topCountriesWithFraud,
      fraudCountries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching geo-analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geo-analysis data' },
      { status: 500 }
    );
  }
}
