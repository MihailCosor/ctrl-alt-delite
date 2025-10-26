import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const collection = await getTransactionsCollection();
    
    // Get top 10 cities with fraud
    const topCitiesWithFraud = await collection.aggregate([
      {
        $match: { classification: 1 } // Only fraud transactions
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
        $match: { classification: 1 } // Only fraud transactions
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
        $match: { classification: 1 }
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
