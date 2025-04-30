import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PaymentForm from '../components/payments/PaymentForm';
import PaymentDetails from '../components/payments/PaymentDetails';
import { Payment, Room, Tenant } from '../types';
import { formatCurrency, formatDate, getPaymentStatusColor } from '../utils/formatters';
import { Plus, Search, Filter, Download, Calendar, ArrowDownUp, MessageCircle, Loader2 } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

const Payments: React.FC = () => {
  const { selectedProperty } = useProperty();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'tenantName' | 'roomNumber' | 'amount' | 'dueDate' | 'date'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (selectedProperty?.id) {
      loadData();
    }
  }, [selectedProperty]);

  const loadData = async () => {
    if (!selectedProperty) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load payments, rooms, and tenants in parallel
      const [paymentsData, roomsData, tenantsData] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('rooms')
          .select('*')
          .eq('property_id', selectedProperty.id),
        supabase
          .from('tenants')
          .select('*')
          .eq('property_id', selectedProperty.id)
      ]);

      if (paymentsData.error) throw paymentsData.error;
      if (roomsData.error) throw roomsData.error;
      if (tenantsData.error) throw tenantsData.error;

      setPayments(paymentsData.data || []);
      setRooms(roomsData.data || []);
      setTenants(tenantsData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const enhancedPayments = payments.map(payment => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const room = rooms.find(r => r.id === payment.roomId);
    
    return {
      ...payment,
      tenantName: tenant?.name || 'Unknown',
      roomNumber: room?.name || 'Unknown'
    };
  });

  const filteredPayments = enhancedPayments
    .filter(payment => {
      const matchesSearch = 
        payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      
      const matchesDate = !dateRange.start || !dateRange.end || 
        (payment.dueDate >= dateRange.start && payment.dueDate <= dateRange.end);
      
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'tenantName':
          comparison = a.tenantName.localeCompare(b.tenantName);
          break;
        case 'roomNumber':
          comparison = a.roomNumber.localeCompare(b.roomNumber);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'date':
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePaymentSubmit = async (data: Partial<Payment>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (selectedPayment) {
        const { error } = await supabase
          .from('payments')
          .update(data)
          .eq('id', selectedPayment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payments')
          .insert([{ ...data, property_id: selectedProperty?.id }]);

        if (error) throw error;
      }

      await loadData();
      setShowPaymentForm(false);
      setSelectedPayment(undefined);
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Failed to save payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppClick = (payment: Payment & { tenantName: string }) => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    if (!tenant?.phone) return;

    const message = payment.status === 'paid'
      ? `Terima kasih telah melakukan pembayaran sebesar ${formatCurrency(payment.amount)} untuk kamar ${payment.roomNumber}.`
      : `Mohon segera lakukan pembayaran sebesar ${formatCurrency(payment.amount)} untuk kamar ${payment.roomNumber} sebelum ${formatDate(payment.dueDate)}.`;

    const phoneNumber = tenant.phone.startsWith('0')
      ? '62' + tenant.phone.slice(1)
      : tenant.phone;

    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
  };

  if (!selectedProperty?.id) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a property to view payments
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Pembayaran</p>
                <p className="mt-1 text-2xl font-semibold text-green-900">{formatCurrency(totalPaid)}</p>
                {dateRange.start && dateRange.end && (
                  <p className="text-xs text-green-600 mt-1">
                    {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Menunggu Pembayaran</p>
                <p className="mt-1 text-2xl font-semibold text-yellow-900">{formatCurrency(totalPending)}</p>
                {dateRange.start && dateRange.end && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Pembayaran Terlambat</p>
                <p className="mt-1 text-2xl font-semibold text-red-900">{formatCurrency(totalOverdue)}</p>
                {dateRange.start && dateRange.end && (
                  <p className="text-xs text-red-600 mt-1">
                    {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Catatan Pembayaran</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari pembayaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <Button 
              icon={<Plus size={16} />} 
              onClick={() => {
                setSelectedPayment(undefined);
                setShowPaymentForm(true);
              }}
              disabled={isLoading}
            >
              Tambah Pembayaran
            </Button>
          </div>
        </CardHeader>

        <div className="px-6 pb-2 flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === 'all' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setStatusFilter('all')}
          >
            Semua
          </Button>
          <Button 
            variant={statusFilter === 'paid' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setStatusFilter('paid')}
          >
            Lunas
          </Button>
          <Button 
            variant={statusFilter === 'pending' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setStatusFilter('pending')}
          >
            Menunggu
          </Button>
          <Button 
            variant={statusFilter === 'overdue' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setStatusFilter('overdue')}
          >
            Terlambat
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">sampai</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortField === 'tenantName') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('tenantName');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Penyewa
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortField === 'roomNumber') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('roomNumber');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Kamar
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortField === 'amount') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('amount');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Jumlah
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortField === 'dueDate') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('dueDate');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Jatuh Tempo
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('date');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      Tanggal Bayar
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
                        <span className="text-gray-500">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payment.tenantName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">Kamar {payment.roomNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{formatDate(payment.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{payment.date ? formatDate(payment.date) : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getPaymentStatusColor(payment.status)}>
                          {payment.status === 'paid' ? 'Lunas' : 
                           payment.status === 'pending' ? 'Menunggu' : 'Terlambat'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {payment.status !== 'paid' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowPaymentForm(true);
                              }}
                            >
                              Bayar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentDetails(true);
                            }}
                          >
                            Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<MessageCircle size={14} />}
                            onClick={() => handleWhatsAppClick(payment)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      {searchQuery
                        ? 'Tidak ada pembayaran yang sesuai dengan pencarian Anda.'
                        : 'Belum ada catatan pembayaran.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showPaymentForm && (
        <PaymentForm
          payment={selectedPayment}
          tenants={tenants}
          rooms={rooms}
          onSubmit={handlePaymentSubmit}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedPayment(undefined);
          }}
        />
      )}

      {showPaymentDetails && selectedPayment && (
        <PaymentDetails
          payment={selectedPayment}
          tenantName={selectedPayment.tenantName}
          roomNumber={selectedPayment.roomNumber}
          onClose={() => {
            setShowPaymentDetails(false);
            setSelectedPayment(undefined);
          }}
        />
      )}
    </div>
  );
};

export default Payments;