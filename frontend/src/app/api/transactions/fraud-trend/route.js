import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const collection = await getTransactionsCollection();
    
    // Get data for the last 24 hours, grouped by 1-hour intervals
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Create 1-hour intervals for the last 24 hours
    const intervals = [];
    for (let i = 0; i < 24; i++) {
      const startTime = new Date(twentyFourHoursAgo.getTime() + (i * 60 * 60 * 1000));
      const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));
      intervals.push({
        start: startTime,
        end: endTime,
        label: startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      });
    }
    
    // Get fraud trend data for each interval
    const trendData = await Promise.all(
      intervals.map(async (interval) => {
        const total = await collection.countDocuments({
          processed_at: { 
            $gte: interval.start, 
            $lt: interval.end 
          }
        });
        
        const fraud = await collection.countDocuments({
          processed_at: { 
            $gte: interval.start, 
            $lt: interval.end 
          },
          classification: 1
        });
        
        return {
          time: interval.label,
          total,
          fraud,
          fraudRate: total > 0 ? (fraud / total * 100).toFixed(1) : 0
        };
      })
    );
    
    return NextResponse.json({
      trendData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching fraud trend data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fraud trend data' },
      { status: 500 }
    );
  }
}
