import React, { useState } from "react";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "Admin",
      status: "Active",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "User",
      status: "Active",
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      role: "User",
      status: "Inactive",
    },
  ]);

  const adminTabs = [
    { id: "users", name: "User Management", icon: "👥" },
    { id: "settings", name: "System Settings", icon: "⚙️" },
    { id: "logs", name: "System Logs", icon: "📋" },
    { id: "backup", name: "Backup & Restore", icon: "💾" },
  ];

  const handleUserStatusToggle = (userId) => {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: user.status === "Active" ? "Inactive" : "Active",
            }
          : user
      )
    );
  };

  const renderUsersTab = () => (
    <div className="glass-card p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-gray-200">User Management</h3>
        <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap">
          Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-violet-500/20">
          <thead className="bg-white/5 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-500/10">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${
                      user.status === "Active"
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-red-500/20 text-red-300 border-red-500/30"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUserStatusToggle(user.id)}
                      className={`px-3 py-1.5 text-xs rounded font-medium transition-all duration-300 hover:scale-105 whitespace-nowrap ${
                        user.status === "Active"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                          : "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
                      }`}
                    >
                      {user.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded hover:bg-blue-500/30 font-medium transition-all duration-300 hover:scale-105 whitespace-nowrap">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold text-gray-200 mb-6">
        System Settings
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Application Name
          </label>
          <input
            type="text"
            defaultValue="Genius DB"
            className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Base URL
          </label>
          <input
            type="text"
            defaultValue="http://localhost:8000"
            className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Data Refresh Interval (minutes)
          </label>
          <input
            type="number"
            defaultValue="5"
            className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifications"
            className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
          />
          <label
            htmlFor="notifications"
            className="ml-2 block text-sm text-gray-300"
          >
            Enable email notifications
          </label>
        </div>

        <button className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap">
          Save Settings
        </button>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold text-gray-200 mb-6">System Logs</h3>

      <div className="bg-black/40 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-green-500/20 backdrop-blur-sm">
        <div>2024-01-15 10:30:15 - INFO - Server started successfully</div>
        <div>2024-01-15 10:30:16 - INFO - Database connection established</div>
        <div>2024-01-15 10:30:17 - INFO - API endpoints loaded</div>
        <div>2024-01-15 10:30:18 - INFO - WebSocket server started</div>
        <div>2024-01-15 10:30:19 - INFO - Application ready</div>
        <div>2024-01-15 10:35:22 - INFO - User login: john@example.com</div>
        <div>2024-01-15 10:35:23 - INFO - Data fetch: /api/transformers</div>
        <div>2024-01-15 10:35:24 - INFO - 150 records retrieved</div>
      </div>
    </div>
  );

  const renderBackupTab = () => (
    <div className="glass-card p-6">
      <h3 className="text-xl font-semibold text-gray-200 mb-6">
        Backup & Restore
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium text-gray-300 mb-4">
            Create Backup
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backup Name
              </label>
              <input
                type="text"
                placeholder="backup_2024_01_15"
                className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
              />
            </div>
            <button className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105 font-medium">
              Create Backup
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-gray-300 mb-4">
            Restore from Backup
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Backup
              </label>
              <select className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15">
                <option className="bg-slate-800">backup_2024_01_15</option>
                <option className="bg-slate-800">backup_2024_01_14</option>
                <option className="bg-slate-800">backup_2024_01_13</option>
              </select>
            </div>
            <button className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105 font-medium">
              Restore Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "users":
        return renderUsersTab();
      case "settings":
        return renderSettingsTab();
      case "logs":
        return renderLogsTab();
      case "backup":
        return renderBackupTab();
      default:
        return renderUsersTab();
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-8">
          Admin Panel
        </h1>

        {/* Admin Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex flex-wrap gap-4">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 hover:scale-105 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-glow"
                    : "text-gray-300 hover:text-violet-400 hover:bg-white/10"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPanel;
