import React from 'react';
import { Payment, Tenant, Room } from '../../types';
import Card, { CardHeader, CardContent, CardFooter } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatCurrency, formatDate, getPaymentStatusColor } from '../../utils/formatters';
import { ChevronRight } from 'lucide-react';

interface UpcomingPaymentsProps {
  payments: Payment[];
  tenants: Tenant[];
  rooms: Room[];
  onViewAllClick: () => void;
}

const UpcomingPayments: React.FC<UpcomingPaymentsProps> = ({ 
  payments, 
  tenants,
  rooms,
  onViewAllClick 
}) => {
  const getTenantName = (tenantId: string): string => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.name || 'Unknown';
  };

  const getRoomNumber = (roomId: string): string => {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown';
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Pembayaran Mendatang</h2>
        <span className="text-sm text-gray-500">Bulan Ini</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{getTenantName(payment.tenantId)}</p>
                <p className="text-sm text-gray-500">Kamar {getRoomNumber(payment.roomId)}</p>
                <p className="text-sm text-gray-500">Jatuh Tempo: {formatDate(payment.dueDate)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(payment.amount)}</p>
                <Badge className={getPaymentStatusColor(payment.status)}>
                  {payment.status === 'paid' ? 'Lunas' : 
                   payment.status === 'pending' ? 'Menunggu' : 'Terlambat'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full flex justify-center items-center" 
          onClick={onViewAllClick}
        >
          Lihat Semua Pembayaran
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UpcomingPayments;