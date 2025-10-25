import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const collection = await getTransactionsCollection();
    
    // Get basic statistics
    const total = await collection.countDocuments({});
    
    // Get fraud vs non-fraud counts
    const fraudCount = await collection.countDocuments({ 
      'classification': 1 
    });
    const nonFraudCount = await collection.countDocuments({ 
      'classification': 0 
    });

    // Get recent activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await collection.countDocuments({
      processed_at: { $gte: oneHourAgo }
    });

    // Get latest transaction timestamp
    const latestTransaction = await collection
      .findOne({}, { sort: { processed_at: -1 } });

    return NextResponse.json({
      total,
      fraud: fraudCount,
      nonFraud: nonFraudCount,
      fraudRate: total > 0 ? (fraudCount / total * 100).toFixed(2) : 0,
      recentActivity: recentCount,
      lastUpdate: latestTransaction?.processed_at || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction stats' },
      { status: 500 }
    );
  }
}

