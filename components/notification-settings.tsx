// components/notification-settings.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NotificationSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function NotificationSettings({ enabled, onToggle }: NotificationSettingsProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {enabled ? <Bell className="w-5 h-5 text-green-600" /> : <BellOff className="w-5 h-5 text-gray-400" />}
            <CardTitle className="text-lg">Notifications</CardTitle>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Info className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold">Notification Rules</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="default" className="mt-0.5">Normal</Badge>
                    <p>No alerts. All conditions optimal.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5">Warning</Badge>
                    <p>Alert when parameter moves out of ideal range.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive" className="mt-0.5">Critical</Badge>
                    <p>Urgent alert when parameter reaches dangerous level.</p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                  <strong>Note:</strong> Notifications trigger every 5 min on data update with 5-min cooldown between duplicate alerts.
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <CardDescription>
          {enabled 
            ? 'Receiving real-time alerts for parameter changes' 
            : 'Notifications are currently disabled'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="notification-toggle" className="flex flex-col gap-1">
            <span className="font-medium">Real-time Alerts</span>
            <span className="text-xs text-gray-500">
              Get notified when parameters leave normal range
            </span>
          </Label>
          <Switch
            id="notification-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
        
        {enabled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold">Active Monitoring</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              You&apos;ll receive alerts for warning and critical conditions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alert Levels</CardTitle>
        <CardDescription>Understanding notification priorities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-950 border-2 border-green-500 flex items-center justify-center text-2xl">
            ✅
          </div>
          <div className="flex-1">
            <div className="font-semibold text-green-700 dark:text-green-400">Normal</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              All parameters within optimal range
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950">No Alert</Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-950 border-2 border-yellow-500 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <div className="flex-1">
            <div className="font-semibold text-yellow-700 dark:text-yellow-400">Warning</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Parameter moving out of ideal range
            </div>
          </div>
          <Badge variant="secondary">8s Alert</Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950 border-2 border-red-500 flex items-center justify-center text-2xl">
            🚨
          </div>
          <div className="flex-1">
            <div className="font-semibold text-red-700 dark:text-red-400">Critical</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Dangerous level - immediate action required
            </div>
          </div>
          <Badge variant="destructive">10s Alert</Badge>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <p><strong>Smart Features:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>5-minute cooldown prevents alert spam</li>
              <li>Multiple alerts batched into single notification</li>
              <li>Action recommendations included</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
