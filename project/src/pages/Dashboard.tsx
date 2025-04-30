import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  CreditCard, 
  ClipboardList, 
  TrendingUp, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import OccupancyChart from '../components/dashboard/OccupancyChart';
import RoomOverview from '../components/dashboard/RoomOverview';
import UpcomingPayments from '../components/dashboard/UpcomingPayments';
import MaintenanceOverview from '../components/dashboard/MaintenanceOverview';
import { formatCurrency } from '../utils/formatters';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { Room, Tenant, Payment, MaintenanceRequest } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { selectedProperty } = useProperty();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  useEffect(() => {
    if (selectedProperty?.id) {
      loadDashboardData();
    }
  }, [selectedProperty]);

  const loadDashboardData = async () => {
    if (!selectedProperty) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get current month's start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Load all data in parallel
      const [roomsData, tenantsData, paymentsData, maintenanceData, monthlyPaymentsData] = await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .order('name'),
        supabase
          .from('tenants')
          .select('*')
          .eq('property_id', selectedProperty.id),
        supabase
          .from('payments')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('maintenance_requests')
          .select('*')
          .eq('property_id', selectedProperty.id)
          .order('created_at', { ascending: false }),
        // Get monthly revenue
        supabase
          .from('payments')
          .select('amount')
          .eq('property_id', selectedProperty.id)
          .eq('status', 'paid')
          .gte('date', monthStart)
          .lte('date', monthEnd)
      ]);

      if (roomsData.error) throw roomsData.error;
      if (tenantsData.error) throw tenantsData.error;
      if (paymentsData.error) throw paymentsData.error;
      if (maintenanceData.error) throw maintenanceData.error;
      if (monthlyPaymentsData.error) throw monthlyPaymentsData.error;

      setRooms(roomsData.data || []);
      setTenants(tenantsData.data || []);
      setPayments(paymentsData.data || []);
      setMaintenanceRequests(maintenanceData.data || []);

      // Calculate monthly revenue
      const monthlyTotal = (monthlyPaymentsData.data || [])
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
      setMonthlyRevenue(monthlyTotal);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate financial summary
  const financialSummary = {
    totalRevenue: payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0),
    pendingPayments: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    overduePayments: payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0),
    monthlyIncome: monthlyRevenue
  };

  // Calculate occupancy summary
  const occupancySummary = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    occupancyRate: rooms.length > 0
      ? Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100)
      : 0
  };

  const pendingPayments = payments.filter(
    p => p.status === 'pending' || p.status === 'overdue'
  );

  const activeMaintenanceRequests = maintenanceRequests.filter(
    r => r.status === 'pending' || r.status === 'in-progress'
  );

  if (!selectedProperty?.id) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a property to view dashboard
      </div>
    );
  }

  if (isLoading && rooms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="mt-2 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Beranda</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Penyewa"
          value={tenants.filter(tenant => tenant.status === 'active').length}
          icon={<Users size={24} />}
          change={{ 
            value: "+2", 
            type: "increase" 
          }}
        />
        <StatCard
          title="Total Kamar"
          value={rooms.length}
          icon={<Building2 size={24} />}
          change={{ 
            value: "0", 
            type: "neutral" 
          }}
        />
        <StatCard
          title="Pendapatan Bulanan"
          value={formatCurrency(financialSummary.monthlyIncome)}
          icon={<CreditCard size={24} />}
          change={{ 
            value: "+5%", 
            type: "increase" 
          }}
        />
        <StatCard
          title="Permintaan Pemeliharaan"
          value={activeMaintenanceRequests.length}
          icon={<ClipboardList size={24} />}
          change={{ 
            value: "-1", 
            type: "decrease" 
          }}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyChart data={occupancySummary} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard
            title="Tingkat Hunian"
            value={`${occupancySummary.occupancyRate}%`}
            icon={<TrendingUp size={24} />}
            change={{ 
              value: "+2.5%", 
              type: "increase" 
            }}
            className="h-full"
          />
          <StatCard
            title="Pembayaran Terlambat"
            value={formatCurrency(financialSummary.overduePayments)}
            icon={<AlertTriangle size={24} />}
            change={{ 
              value: formatCurrency(financialSummary.overduePayments), 
              type: "increase" 
            }}
            className="h-full"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingPayments 
          payments={pendingPayments} 
          tenants={tenants}
          rooms={rooms}
          onViewAllClick={() => onNavigate('payments')}
        />
        <MaintenanceOverview 
          maintenanceRequests={activeMaintenanceRequests} 
          rooms={rooms}
          onViewAllClick={() => onNavigate('maintenance')}
        />
      </div>
      
      <RoomOverview 
        rooms={rooms} 
        onViewAllClick={() => onNavigate('rooms')}
      />
    </div>
  );
};

export default Dashboard;