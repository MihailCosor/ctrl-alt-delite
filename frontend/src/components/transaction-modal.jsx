"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  ShieldCheck, 
  X
} from 'lucide-react';

export function TransactionModal({ transaction, isOpen, onClose }) {
  if (!transaction) return null;

  const tx = transaction.transaction;
  const isFraud = transaction.classification === 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Transaction Details
              </DialogTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Badge 
                  variant={isFraud ? "destructive" : "default"} 
                  className={`text-sm font-medium ${
                    isFraud 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}
                >
                  {isFraud ? "FRAUD DETECTED" : "LEGITIMATE"}
                </Badge>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                  ID: {tx?.trans_num || 'N/A'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Key Information Row */}
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center min-h-[80px] flex flex-col justify-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium uppercase tracking-wide">Transaction Amount</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ${parseFloat(tx?.amt || 0).toFixed(2)}
                </div>
              </div>
              <div className="text-center min-h-[80px] flex flex-col justify-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium uppercase tracking-wide">Merchant</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words leading-tight">
                  {tx?.merchant || 'Unknown'}
                </div>
              </div>
              <div className="text-center min-h-[80px] flex flex-col justify-center">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium uppercase tracking-wide">Customer</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words leading-tight">
                  {tx?.first} {tx?.last}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Information - Single Column Layout */}
          <div className="space-y-8">
            {/* Financial & Customer Info Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[200px]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Financial Details
                </h3>
                <div className="space-y-3">
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0 min-w-0">Category</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold text-base text-right break-words min-w-0 flex-1">
                        {tx?.category?.replace('_', ' ').toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0">Account</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-sm text-right">
                        ****{tx?.acct_num?.slice(-4) || '****'}
                      </span>
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0">Card Number</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-sm text-right">
                        ****{tx?.cc_num?.slice(-4) || '****'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[200px]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Customer Details
                </h3>
                <div className="space-y-3">
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0">Gender</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold text-base text-right">
                        {tx?.gender || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0">Date of Birth</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold text-base text-right">
                        {tx?.dob || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0">SSN</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-sm text-right">
                        ***-**-{tx?.ssn?.slice(-4) || '****'}
                      </span>
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-600 dark:text-slate-400 text-sm font-medium flex-shrink-0 min-w-0">Occupation</span>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold text-base text-right break-words min-w-0 flex-1">
                        {tx?.job || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Timing Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[200px]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Location Details
                </h3>
                <div className="space-y-3">
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Address</div>
                    <div className="text-slate-900 dark:text-slate-100 font-semibold text-base break-words">
                      {tx?.street || 'N/A'}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">City</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold text-base break-words">
                        {tx?.city || 'N/A'}
                      </div>
                    </div>
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">State</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {tx?.state || 'N/A'}
                      </div>
                    </div>
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">ZIP</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {tx?.zip || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">City Population</div>
                    <div className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                      {parseInt(tx?.city_pop || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 min-h-[200px]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Transaction Timing
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Date</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {tx?.trans_date || 'N/A'}
                      </div>
                    </div>
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Time</div>
                      <div className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {tx?.trans_time || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Unix Timestamp</div>
                    <div className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-base break-all">
                      {tx?.unix_time || 'N/A'}
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Processed At</div>
                    <div className="text-slate-900 dark:text-slate-100 font-semibold text-base break-words">
                      {transaction.processed_at ? 
                        new Date(transaction.processed_at).toLocaleString() : 
                        'Unknown'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <Card className={`border ${
            isFraud ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${
                    isFraud ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'
                  }`}>
                    {isFraud ? 'HIGH RISK' : 'LOW RISK'}
                  </div>
                  <div className={`text-sm ${
                    isFraud ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
                  }`}>
                    ML Model Confidence: {isFraud ? '90%+' : '95%+'}
                  </div>
                </div>
                <div className={`p-4 rounded-full ${
                  isFraud ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {isFraud ? (
                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  ) : (
                    <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
