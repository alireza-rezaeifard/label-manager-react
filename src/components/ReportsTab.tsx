import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
const COLORS = ['#7367f0', '#28c76f', '#ea5455', '#ff9f43', '#00cfe8', '#a8aaaf', '#6d62e0', '#20a862'];

export default function ReportsTab({ records, onFilter }) {
  const [reportType, setReportType] = useState('type');

  const typeData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.type || 'نامشخص';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [records]);

  const projectData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.project || 'نامشخص';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [records]);

  const partyData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.party || 'نامشخص';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [records]);

  const monthlyData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const month = (r.date || '').slice(0, 7);
      if (month) {
        map[month] = (map[month] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }, [records]);

  const amountByProject = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const project = r.project || 'نامشخص';
      const num = parseInt(String(r.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
      map[project] = (map[project] || 0) + num;
    });
    const entries = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10);
    return entries.map(([name, value]) => ({ name, value: Math.round(value / 10000) / 100 }));
  }, [records]);

  const currentData = reportType === 'type' ? typeData
    : reportType === 'project' ? projectData
    : reportType === 'party' ? partyData
    : reportType === 'monthly' ? monthlyData
    : amountByProject;

  const getReportName = () => {
    const names = { type: 'نوع', project: 'پروژه', party: 'طرف حساب', monthly: 'ماهانه', amount: 'مبلغ به تفکیک پروژه' };
    return names[reportType] || '';
  };

  const isPie = reportType !== 'monthly' && reportType !== 'amount';

  const handleChartClick = (entry) => {
    if (!onFilter || !entry || !entry.name) return;
    onFilter(reportType, entry.name);
  };

  const totalCount = records.length;
  const totalAmount = records.reduce((sum, r) => {
    const num = parseInt(String(r.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
    return sum + num;
  }, 0);

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><i className="ti ti-chart-bar"></i></div>
        <h3 style={{ marginBottom: '0.5rem' }}>داده‌ای برای گزارش وجود ندارد</h3>
        <p style={{ opacity: 0.7 }}>ابتدا رکوردهایی اضافه کنید</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon primary"><i className="ti ti-files"></i></div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">مجموع رکوردها</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><i className="ti ti-currency-dollar"></i></div>
          <div className="stat-value">{totalAmount.toLocaleString('fa-IR')}</div>
          <div className="stat-label">مجموع مبالغ</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><i className="ti ti-tag"></i></div>
          <div className="stat-value">{typeData.length}</div>
          <div className="stat-label">نوع برچسب</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><i className="ti ti-building"></i></div>
          <div className="stat-value">{projectData.length}</div>
          <div className="stat-label">پروژه‌ها</div>
        </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ margin: 0 }}>گزارش بر اساس {getReportName()}</h4>
          <div className="d-flex gap-2 flex-wrap">
            {[
              { key: 'type', icon: 'ti-tag', label: 'نوع' },
              { key: 'project', icon: 'ti-building', label: 'پروژه' },
              { key: 'party', icon: 'ti-user', label: 'طرف حساب' },
              { key: 'monthly', icon: 'ti-calendar', label: 'ماهانه' },
              { key: 'amount', icon: 'ti-currency-dollar', label: 'مبلغ' },
            ].map(b => (
              <button key={b.key}
                className={`tab-btn ${reportType === b.key ? 'active' : ''}`}
                onClick={() => setReportType(b.key)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <i className={`ti ${b.icon}`}></i> {b.label}
              </button>
            ))}
          </div>
        </div>

        {onFilter && (
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>
            <i className="ti ti-click"></i> روی هر بخش از نمودار کلیک کنید تا رکوردهای مربوطه فیلتر شوند
          </div>
        )}

        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            {isPie ? (
              <PieChart>
                <Pie data={currentData} cx="50%" cy="50%" outerRadius={120} fill="#8884d8" dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  onClick={handleChartClick}
                  style={{ cursor: 'pointer' }}>
                  {currentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onClick={(e) => {
                  if (e?.activePayload?.[0]?.payload) {
                    handleChartClick(e.activePayload[0].payload);
                  }
                }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#7367f0" radius={[4, 4, 0, 0]}>
                  {currentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
