'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Shield, Download, Trash2, Loader2 } from 'lucide-react';

export function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/user/export', { method: 'POST' });
      const data = await res.json();
      if (data.downloadUrl) {
        const downloadRes = await fetch(data.downloadUrl);
        const blob = await downloadRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lurisa-export-${Date.now()}.json`;
        a.click();
      }
    } finally { setExporting(false); }
  }

  async function handleDelete() {
    if (!confirm('This will permanently delete your account and all data. Continue?')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) window.location.href = '/login';
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Settings</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Manage your privacy and data</p>
      </div>

      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Shield className="mr-2 h-5 w-5" />Privacy Controls
          </CardTitle>
          <CardDescription>You own all your memories. Control them here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Pause memory formation</p>
              <p className="text-sm text-charcoal-500">Stop lurisa from creating new memories</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-charcoal-700 dark:text-parchment-100">Data retention</p>
              <p className="text-sm text-charcoal-500">Days to keep conversation transcripts</p>
            </div>
            <Input type="number" defaultValue={365} className="w-24 bg-parchment-100" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Download className="mr-2 h-5 w-5" />Export Your Data
          </CardTitle>
          <CardDescription>Download everything lurisa knows about you</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export All Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-error/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-error flex items-center">
            <Trash2 className="mr-2 h-5 w-5" />Delete Account
          </CardTitle>
          <CardDescription>Permanently remove your account and all data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="password" placeholder="Enter password to confirm" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="bg-parchment-100" />
          <Button onClick={handleDelete} disabled={deleting || !deletePassword} variant="destructive">
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete Account Forever
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
