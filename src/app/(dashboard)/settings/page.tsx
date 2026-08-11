'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Download, 
  Trash2, 
  Loader2, 
  Moon, 
  Sun, 
  Bell, 
  Database,
  Key,
  Eye,
  Smartphone
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface UserProfile {
  name: string | null;
  email: string;
  memoryPaused: boolean;
  dataRetentionDays: number;
  consentGiven: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningCheckin, setMorningCheckin] = useState(true);
  const [eveningReflection, setEveningReflection] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/user/export', { method: 'POST' });
      const data = await res.json();
      if (data.jobId) {
        // Poll for completion
        const checkInterval = setInterval(async () => {
          const checkRes = await fetch(`/api/user/export/${data.jobId}`);
          if (checkRes.ok) {
            const exportData = await checkRes.json();
            clearInterval(checkInterval);

            // Download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lurisa-export-${Date.now()}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        }, 2000);

        // Timeout after 60 seconds
        setTimeout(() => clearInterval(checkInterval), 60000);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        window.location.href = '/login';
      }
    } finally {
      setDeleting(false);
    }
  }

  async function updateSetting(key: string, value: any) {
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Settings</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Manage your privacy, data, and preferences</p>
      </div>

      {/* Appearance */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how lurisa looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Dark mode</p>
              <p className="text-sm text-charcoal-500">Use dark theme for low-light environments</p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-parchment-500/50 hover:bg-parchment-500 transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Control when lurisa reaches out to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Enable notifications</p>
              <p className="text-sm text-charcoal-500">Allow lurisa to send you thoughtful check-ins</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Morning check-in</p>
              <p className="text-sm text-charcoal-500">Daily encouragement and reflection prompt</p>
            </div>
            <Switch checked={morningCheckin} onCheckedChange={setMorningCheckin} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Evening reflection</p>
              <p className="text-sm text-charcoal-500">End-of-day progress and lesson capture</p>
            </div>
            <Switch checked={eveningReflection} onCheckedChange={setEveningReflection} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Privacy Controls
          </CardTitle>
          <CardDescription>You own all your memories. Control them here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Pause memory formation</p>
              <p className="text-sm text-charcoal-500">Stop lurisa from creating new memories</p>
            </div>
            <Switch 
              checked={profile?.memoryPaused || false} 
              onCheckedChange={(v) => updateSetting('memoryPaused', v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-charcoal-700 dark:text-parchment-100">Data retention</p>
                <p className="text-sm text-charcoal-500">Days to keep raw conversation transcripts</p>
              </div>
              <Input 
                type="number" 
                defaultValue={profile?.dataRetentionDays || 365} 
                className="w-24 bg-parchment-100"
                min={1}
                max={3650}
              />
            </div>
          </div>

          {profile?.consentGiven && (
            <div className="flex items-center space-x-2 text-xs text-charcoal-300">
              <Key size={12} />
              <span>Consent given on {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            Trusted Devices
          </CardTitle>
          <CardDescription>Manage devices that can access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceList />
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Your Data
          </CardTitle>
          <CardDescription>Export or delete your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Export all data</p>
              <p className="text-sm text-charcoal-500">Download everything lurisa knows about you</p>
            </div>
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-error flex items-center">
            <Trash2 className="mr-2 h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete your account and all data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-error">
                This action cannot be undone. All your memories, conversations, and data will be permanently deleted.
              </p>
              <Input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="bg-parchment-100"
              />
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete} 
                  disabled={deleting || !deletePassword}
                >
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Permanently Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceList() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await fetch('/api/user/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Skeleton className="h-20 w-full" />;
  if (devices.length === 0) return <p className="text-sm text-charcoal-500">No devices found</p>;

  return (
    <div className="space-y-3">
      {devices.map((device) => (
        <div key={device.id} className="flex items-center justify-between p-3 bg-parchment-500/30 rounded-lg">
          <div>
            <p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100">{device.name || 'Unknown Device'}</p>
            <p className="text-xs text-charcoal-300">
              Last seen: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
            </p>
          </div>
          <Badge variant={device.trusted ? 'secondary' : 'outline'} className="text-xs">
            {device.trusted ? 'Trusted' : 'Untrusted'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
