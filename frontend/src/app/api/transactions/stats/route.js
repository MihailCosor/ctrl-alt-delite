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

    // Get time-based fraud statistics
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Last minute stats
    const lastMinuteTotal = await collection.countDocuments({
      processed_at: { $gte: oneMinuteAgo }
    });
    const lastMinuteFraud = await collection.countDocuments({
      processed_at: { $gte: oneMinuteAgo },
      classification: 1
    });

    // Last hour stats
    const lastHourTotal = await collection.countDocuments({
      processed_at: { $gte: oneHourAgo }
    });
    const lastHourFraud = await collection.countDocuments({
      processed_at: { $gte: oneHourAgo },
      classification: 1
    });

    // Last 24 hours stats
    const last24HoursTotal = await collection.countDocuments({
      processed_at: { $gte: oneDayAgo }
    });
    const last24HoursFraud = await collection.countDocuments({
      processed_at: { $gte: oneDayAgo },
      classification: 1
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
      timestamp: new Date().toISOString(),
      // Time-based fraud statistics
      lastMinute: {
        total: lastMinuteTotal,
        fraud: lastMinuteFraud,
        fraudRate: lastMinuteTotal > 0 ? (lastMinuteFraud / lastMinuteTotal * 100).toFixed(2) : 0
      },
      lastHour: {
        total: lastHourTotal,
        fraud: lastHourFraud,
        fraudRate: lastHourTotal > 0 ? (lastHourFraud / lastHourTotal * 100).toFixed(2) : 0
      },
      last24Hours: {
        total: last24HoursTotal,
        fraud: last24HoursFraud,
        fraudRate: last24HoursTotal > 0 ? (last24HoursFraud / last24HoursTotal * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction stats' },
      { status: 500 }
    );
  }
}

