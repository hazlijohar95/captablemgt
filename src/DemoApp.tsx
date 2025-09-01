import React, { useState } from 'react';
import { 
  Building2, Users, FileText, TrendingUp, Calculator, 
  BarChart3, DollarSign, PieChart, Settings, Home,
  Plus, Edit, Trash2, Eye, Download
} from 'lucide-react';

// Mock data for demonstration
const mockCompany = {
  name: "TechStartup Inc.",
  totalShares: 10000000,
  sharesIssued: 7500000,
  valuation: 50000000,
  founded: "2022-01-15"
};

const mockStakeholders = [
  { id: 1, name: "John Founder", type: "Founder", shares: 3000000, percentage: 40, vestingStatus: "75% vested" },
  { id: 2, name: "Jane Co-Founder", type: "Founder", shares: 2000000, percentage: 26.67, vestingStatus: "75% vested" },
  { id: 3, name: "Seed Ventures", type: "Investor", shares: 1500000, percentage: 20, vestingStatus: "Fully vested" },
  { id: 4, name: "Employee Pool", type: "ESOP", shares: 750000, percentage: 10, vestingStatus: "Various" },
  { id: 5, name: "Angel Investor", type: "Investor", shares: 250000, percentage: 3.33, vestingStatus: "Fully vested" },
];

const mockSecurities = [
  { id: 1, type: "Common Stock", quantity: 5000000, pricePerShare: 0.001, totalValue: 5000 },
  { id: 2, type: "Series A Preferred", quantity: 1500000, pricePerShare: 2.50, totalValue: 3750000 },
  { id: 3, type: "Stock Options", quantity: 750000, pricePerShare: 1.00, totalValue: 750000 },
  { id: 4, type: "Warrants", quantity: 250000, pricePerShare: 2.00, totalValue: 500000 },
];

const mockRounds = [
  { id: 1, name: "Seed Round", date: "2022-03-15", amount: 1500000, valuation: 10000000, dilution: "15%" },
  { id: 2, name: "Series A", date: "2023-06-20", amount: 5000000, valuation: 25000000, dilution: "20%" },
  { id: 3, name: "Series B (Projected)", date: "2024-12-01", amount: 15000000, valuation: 75000000, dilution: "20%" },
];

type View = 'dashboard' | 'cap-table' | 'stakeholders' | 'securities' | 'scenarios' | 'documents' | 'vesting' | 'reports';

function DemoApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedStakeholder, setSelectedStakeholder] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const MenuItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: View }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-blue-100 text-blue-700' 
          : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const StatCard = ({ title, value, change, icon: Icon }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">
              {change}
            </p>
          )}
        </div>
        <Icon className="text-gray-400" size={24} />
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Company Valuation" 
          value="$50M" 
          change="+100% from Series A" 
          icon={TrendingUp}
        />
        <StatCard 
          title="Total Stakeholders" 
          value="127" 
          change="+12 this quarter" 
          icon={Users}
        />
        <StatCard 
          title="Shares Issued" 
          value="7.5M" 
          change="75% of authorized" 
          icon={PieChart}
        />
        <StatCard 
          title="Next Vesting" 
          value="March 15" 
          change="250,000 shares" 
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Ownership Distribution</h3>
          <div className="space-y-3">
            {mockStakeholders.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    s.type === 'Founder' ? 'bg-blue-500' : 
                    s.type === 'Investor' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">{s.percentage}%</span>
                  <span className="text-xs text-gray-500 ml-2">({s.shares.toLocaleString()} shares)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div className="flex-1">
                <p className="text-sm">New employee granted 10,000 options</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <div className="flex-1">
                <p className="text-sm">Vesting milestone reached for 5 employees</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
              <div className="flex-1">
                <p className="text-sm">Board package generated for Q3 meeting</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCapTable = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Capitalization Table</h3>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus size={16} />
                <span>Add Stakeholder</span>
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2">
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stakeholder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ownership %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vesting Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockStakeholders.map((stakeholder) => (
                <tr key={stakeholder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stakeholder.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      stakeholder.type === 'Founder' ? 'bg-blue-100 text-blue-800' :
                      stakeholder.type === 'Investor' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {stakeholder.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {stakeholder.shares.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {stakeholder.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stakeholder.vestingStatus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Eye size={16} />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 mr-3">
                      <Edit size={16} />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderScenarios = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Funding Round Scenarios</h3>
        <div className="space-y-4">
          {mockRounds.map(round => (
            <div key={round.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{round.name}</h4>
                <span className="text-sm text-gray-500">{round.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Amount: </span>
                  <span className="font-semibold">${(round.amount / 1000000).toFixed(1)}M</span>
                </div>
                <div>
                  <span className="text-gray-600">Valuation: </span>
                  <span className="font-semibold">${(round.valuation / 1000000).toFixed(0)}M</span>
                </div>
                <div>
                  <span className="text-gray-600">Dilution: </span>
                  <span className="font-semibold">{round.dilution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Scenario Modeling</h4>
          <p className="text-sm text-blue-700 mb-3">
            Model different funding scenarios to understand dilution impact
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create New Scenario
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard': return renderDashboard();
      case 'cap-table': return renderCapTable();
      case 'scenarios': return renderScenarios();
      case 'stakeholders':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Stakeholder Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockStakeholders.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h4 className="font-medium">{s.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{s.type}</p>
                  <p className="text-sm font-semibold mt-2">{s.shares.toLocaleString()} shares ({s.percentage}%)</p>
                  <p className="text-xs text-gray-500 mt-1">{s.vestingStatus}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'securities':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Securities</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price/Share</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockSecurities.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-sm">{s.type}</td>
                      <td className="px-4 py-3 text-sm text-right">{s.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">${s.pricePerShare.toFixed(3)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">${s.totalValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'vesting':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Vesting Schedules</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-medium">Founder Vesting</h4>
                <p className="text-sm text-gray-600">4-year vesting with 1-year cliff</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2" style={{width: '75%'}}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">75% vested (3,750,000 shares)</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-medium">Employee Options</h4>
                <p className="text-sm text-gray-600">Various schedules</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2" style={{width: '45%'}}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">45% vested (337,500 shares)</p>
              </div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Document Library</h3>
            <div className="space-y-2">
              {['Certificate of Incorporation', 'Stock Purchase Agreement', 'Option Plan', 'Board Resolutions', 'Cap Table Export Q3 2024'].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-sm">{doc}</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700">
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Reports & Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md text-left">
                <BarChart3 className="text-blue-600 mb-2" />
                <h4 className="font-medium">Waterfall Analysis</h4>
                <p className="text-sm text-gray-600 mt-1">Exit scenario modeling</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md text-left">
                <Calculator className="text-green-600 mb-2" />
                <h4 className="font-medium">409A Valuation</h4>
                <p className="text-sm text-gray-600 mt-1">Fair market value report</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md text-left">
                <PieChart className="text-purple-600 mb-2" />
                <h4 className="font-medium">Dilution Analysis</h4>
                <p className="text-sm text-gray-600 mt-1">Round-by-round impact</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md text-left">
                <FileText className="text-orange-600 mb-2" />
                <h4 className="font-medium">Board Package</h4>
                <p className="text-sm text-gray-600 mt-1">Quarterly reports</p>
              </button>
            </div>
          </div>
        );
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="text-blue-600" size={32} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cap Table Pro</h1>
              <p className="text-xs text-gray-500">Demo Mode</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          <MenuItem icon={Home} label="Dashboard" view="dashboard" />
          <MenuItem icon={PieChart} label="Cap Table" view="cap-table" />
          <MenuItem icon={Users} label="Stakeholders" view="stakeholders" />
          <MenuItem icon={FileText} label="Securities" view="securities" />
          <MenuItem icon={TrendingUp} label="Scenarios" view="scenarios" />
          <MenuItem icon={Calculator} label="Vesting" view="vesting" />
          <MenuItem icon={BarChart3} label="Reports" view="reports" />
          <MenuItem icon={FileText} label="Documents" view="documents" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-blue-900">Demo Company</p>
            <p className="text-xs text-blue-700 mt-1">TechStartup Inc.</p>
            <p className="text-xs text-blue-600 mt-1">Series A • $50M valuation</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {currentView.replace('-', ' ')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentView === 'dashboard' && 'Overview of your cap table and key metrics'}
            {currentView === 'cap-table' && 'Complete ownership breakdown and equity distribution'}
            {currentView === 'stakeholders' && 'Manage shareholders, employees, and investors'}
            {currentView === 'securities' && 'Track all security types and transactions'}
            {currentView === 'scenarios' && 'Model funding rounds and exit scenarios'}
            {currentView === 'vesting' && 'Monitor vesting schedules and milestones'}
            {currentView === 'reports' && 'Generate reports and analytics'}
            {currentView === 'documents' && 'Legal documents and agreements'}
          </p>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}

export default DemoApp;