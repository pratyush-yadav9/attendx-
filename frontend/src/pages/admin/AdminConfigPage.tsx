import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Wifi, 
  Bell, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ShieldCheck, 
  Navigation,
  Layers,
  Radio
} from 'lucide-react';
import { 
  adminService, 
  LocationConfig, 
  WifiNetworkItem 
} from '../../services/adminService';

export const AdminConfigPage: React.FC = () => {
  const [location, setLocation] = useState<LocationConfig>({
    campus_name: 'Main University Campus',
    latitude: 28.6139,
    longitude: 77.2090,
    radius_meters: 250,
    is_active: true
  });
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetworkItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Location saving state
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  // Add Wi-Fi form state
  const [newWifi, setNewWifi] = useState({
    ssid: '',
    bssid: '',
    building: 'Main Academic Block'
  });
  const [isAddingWifi, setIsAddingWifi] = useState<boolean>(false);
  const [wifiSuccessMsg, setWifiSuccessMsg] = useState<string | null>(null);

  // Broadcast Notification state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    category: 'SYSTEM_ALERT',
    target_role: 'ALL'
  });
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [locRes, wifiRes] = await Promise.all([
        adminService.getLocation(),
        adminService.getWifiNetworks()
      ]);
      if (locRes) setLocation(locRes);
      setWifiNetworks(wifiRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLocation(true);
    setLocationSuccessMsg(null);
    try {
      await adminService.setLocation(location);
      setLocationSuccessMsg('Campus geofence perimeter saved and enforced across anti-proxy system.');
      setTimeout(() => setLocationSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update campus geofence.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleFetchCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
      },
      (err) => {
        alert(`Failed to fetch current GPS: ${err.message}`);
      }
    );
  };

  const handleAddWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWifi.ssid.trim()) return;

    setIsAddingWifi(true);
    setWifiSuccessMsg(null);
    try {
      await adminService.addWifiNetwork({
        ssid: newWifi.ssid.trim(),
        bssid: newWifi.bssid.trim() || undefined,
        building: newWifi.building,
        status: 'ACTIVE'
      });
      setWifiSuccessMsg(`Wi-Fi network "${newWifi.ssid}" registered.`);
      setNewWifi({ ssid: '', bssid: '', building: 'Main Academic Block' });
      const updated = await adminService.getWifiNetworks();
      setWifiNetworks(updated);
      setTimeout(() => setWifiSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to register Wi-Fi network.');
    } finally {
      setIsAddingWifi(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.message.trim()) return;

    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await adminService.broadcastNotification(broadcastForm);
      setBroadcastResult(`Broadcast delivered to ${res.count} active users.`);
      setBroadcastForm({
        title: '',
        message: '',
        category: 'SYSTEM_ALERT',
        target_role: 'ALL'
      });
      setTimeout(() => setBroadcastResult(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to send broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-attendx-muted">Loading anti-proxy configuration parameters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-attendx-blue uppercase tracking-wider">
            Campus Infrastructure Settings
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-attendx-navy tracking-tight mt-0.5">
            Geofence, Wi-Fi & Notification Center
          </h1>
          <p className="text-xs text-attendx-muted mt-1">
            Configure physical coordinates, authorized wireless access points, and college-wide announcements.
          </p>
        </div>

        <Link
          to="/admin/dashboard"
          className="attendx-btn-secondary px-4 py-2.5 text-xs font-bold rounded-xl self-start sm:self-auto"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECTION 1: GEOFENCE LOCATION CONFIGURATION */}
        <div className="attendx-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-attendx-blue flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-attendx-navy">
                  Campus Geofence Perimeter
                </h3>
                <p className="text-xs text-attendx-muted">
                  Haversine spherical distance verification for attendance check-ins.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFetchCurrentGPS}
              className="text-xs font-bold text-attendx-blue hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
            >
              <Navigation className="w-3.5 h-3.5" /> Detect Current GPS
            </button>
          </div>

          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-attendx-navy mb-1">
                Campus / Facility Name
              </label>
              <input
                type="text"
                required
                value={location.campus_name}
                onChange={(e) => setLocation({ ...location, campus_name: e.target.value })}
                className="attendx-input text-xs w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Latitude (Center)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={location.latitude}
                  onChange={(e) => setLocation({ ...location, latitude: parseFloat(e.target.value) })}
                  className="attendx-input text-xs w-full font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-attendx-navy mb-1">
                  Longitude (Center)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={location.longitude}
                  onChange={(e) => setLocation({ ...location, longitude: parseFloat(e.target.value) })}
                  className="attendx-input text-xs w-full font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-attendx-navy mb-1">
                Authorized Geofence Radius (Meters): <strong className="text-attendx-blue">{location.radius_meters}m</strong>
              </label>
              <input
                type="range"
                min={50}
                max={2000}
                step={25}
                value={location.radius_meters}
                onChange={(e) => setLocation({ ...location, radius_meters: parseInt(e.target.value) })}
                className="w-full accent-attendx-blue"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>50m (Tight boundary)</span>
                <span>250m (Recommended)</span>
                <span>2000m (Large campus)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="geofence_active"
                checked={location.is_active}
                onChange={(e) => setLocation({ ...location, is_active: e.target.checked })}
                className="rounded border-slate-300 text-attendx-blue focus:ring-attendx-blue"
              />
              <label htmlFor="geofence_active" className="text-xs font-semibold text-attendx-navy">
                Enforce mandatory geofence rejection for student QR scans
              </label>
            </div>

            {locationSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{locationSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingLocation}
              className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center gap-2 rounded-xl"
            >
              <Save className="w-4 h-4" />
              {isSavingLocation ? 'Saving Geofence...' : 'Save Geofence Settings'}
            </button>
          </form>
        </div>

        {/* SECTION 2: CAMPUS WI-FI NETWORKS */}
        <div className="attendx-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-attendx-navy">
                Authorized Campus Wi-Fi Networks
              </h3>
              <p className="text-xs text-attendx-muted">
                Whitelisted networks verified during dynamic attendance capture.
              </p>
            </div>
          </div>

          {/* Add Wi-Fi Form */}
          <form onSubmit={handleAddWifi} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-attendx-muted uppercase tracking-wider block">
              Register New Wi-Fi Access Point
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Network SSID (e.g. CAMPUS_SECURE)"
                value={newWifi.ssid}
                onChange={(e) => setNewWifi({ ...newWifi, ssid: e.target.value })}
                className="attendx-input text-xs"
              />
              <input
                type="text"
                placeholder="Building / Hall location"
                value={newWifi.building}
                onChange={(e) => setNewWifi({ ...newWifi, building: e.target.value })}
                className="attendx-input text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingWifi}
              className="attendx-btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Wi-Fi Network
            </button>

            {wifiSuccessMsg && (
              <p className="text-xs text-attendx-success font-semibold">{wifiSuccessMsg}</p>
            )}
          </form>

          {/* Wi-Fi Networks List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {wifiNetworks.map((net) => (
              <div key={net.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-cyan-600" />
                  <div>
                    <span className="font-bold text-attendx-navy block">{net.ssid}</span>
                    <span className="text-[10px] text-attendx-muted">{net.building}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-attendx-success border border-emerald-200">
                  {net.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: BROADCAST NOTIFICATION CENTER */}
      <div className="attendx-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-attendx-navy">
              College-Wide Notification Dispatcher
            </h3>
            <p className="text-xs text-attendx-muted">
              Broadcast critical notices directly to student and faculty dashboards in real time.
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-attendx-navy mb-1">
                Announcement Title <span className="text-attendx-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Severe Weather Schedule Notice"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                className="attendx-input text-xs w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-attendx-navy mb-1">
                Target Audience
              </label>
              <select
                value={broadcastForm.target_role}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, target_role: e.target.value })}
                className="attendx-input text-xs w-full font-bold"
              >
                <option value="ALL">All Users (Everyone)</option>
                <option value="STUDENT">Students Only</option>
                <option value="TEACHER">Faculty Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-attendx-navy mb-1">
              Message Content <span className="text-attendx-danger">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Enter official text for notification broadcast..."
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              className="attendx-input text-xs w-full resize-none"
            />
          </div>

          {broadcastResult && (
            <div className="p-3 rounded-2xl bg-emerald-50 text-attendx-success border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{broadcastResult}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isBroadcasting}
            className="attendx-btn-primary text-xs px-5 py-2.5 flex items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800"
          >
            {isBroadcasting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Broadcast Announcement
          </button>
        </form>
      </div>
    </div>
  );
};
