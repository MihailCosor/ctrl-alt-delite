import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const page = parseInt(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    const collection = await getTransactionsCollection();
    
    // Get latest 100 transactions with pagination
    const transactions = await collection
      .find({})
      .sort({ processed_at: -1 })
      .limit(100) // Always get latest 100
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = Math.min(await collection.countDocuments({}), 100);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching latest transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest transactions' },
      { status: 500 }
    );
  }
}

