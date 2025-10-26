import { NextResponse } from 'next/server';
import { getTransactionsCollection } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;
    const sort = searchParams.get('sort') || 'processed_at';
    const order = searchParams.get('order') || 'desc';

    const collection = await getTransactionsCollection();
    
    // Get recent transactions with pagination
    const transactions = await collection
      .find({})
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await collection.countDocuments({});

    return NextResponse.json({
      transactions,
      total,
      limit,
      skip,
      hasMore: skip + limit < total
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

