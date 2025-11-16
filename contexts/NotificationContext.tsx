// contexts/NotificationContext.tsx
"use client";

import React, { createContext, useContext, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ParameterAlert } from '@/lib/agroMonitoring';

interface NotificationContextType {
  sendParameterAlert: (alert: ParameterAlert) => void;
  sendMultipleAlerts: (alerts: ParameterAlert[]) => void;
  sendSuccessNotification: (message: string) => void;
  sendInfoNotification: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Track recently sent alerts to avoid duplicates
  const recentAlerts = useRef<Map<string, number>>(new Map());
  const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

  const sendParameterAlert = useCallback((alert: ParameterAlert) => {
    const now = Date.now();
    const alertKey = `${alert.parameter}-${alert.status}`;
    const lastSent = recentAlerts.current.get(alertKey);

    // Check cooldown period
    if (lastSent && now - lastSent < ALERT_COOLDOWN) {
      return; // Skip if alert was sent recently
    }

    // Update last sent time
    recentAlerts.current.set(alertKey, now);

    // Send notification based on status
    if (alert.status === 'critical') {
      toast.error(alert.message, {
        description: (
          <div className="space-y-2">
            <div className="font-semibold">
              {alert.icon} Current Value: {alert.value.toFixed(1)}
            </div>
            {alert.action && (
              <div className="text-sm">
                <strong>Action Required:</strong> {alert.action}
              </div>
            )}
          </div>
        ),
        duration: 10000,
      });
    } else if (alert.status === 'warning') {
      toast.warning(alert.message, {
        description: (
          <div className="space-y-2">
            <div className="font-semibold">
              {alert.icon} Current Value: {alert.value.toFixed(1)}
            </div>
            {alert.action && (
              <div className="text-sm">
                <strong>Recommended Action:</strong> {alert.action}
              </div>
            )}
          </div>
        ),
        duration: 8000,
      });
    }
  }, []);

  const sendMultipleAlerts = useCallback((alerts: ParameterAlert[]) => {
    // Group alerts by status
    const criticalAlerts = alerts.filter(a => a.status === 'critical');
    const warningAlerts = alerts.filter(a => a.status === 'warning');

    // Send critical alerts first
    if (criticalAlerts.length > 0) {
      if (criticalAlerts.length === 1) {
        sendParameterAlert(criticalAlerts[0]);
      } else {
        // Send a summary notification for multiple critical alerts
        toast.error(`🚨 ${criticalAlerts.length} Critical Alerts!`, {
          description: (
            <div className="space-y-1">
              {criticalAlerts.map((alert, idx) => (
                <div key={idx} className="text-sm">
                  {alert.icon} {alert.parameter}: {alert.value.toFixed(1)}
                </div>
              ))}
            </div>
          ),
          duration: 12000,
        });
      }
    }

    // Send warning alerts
    if (warningAlerts.length > 0) {
      if (warningAlerts.length === 1) {
        sendParameterAlert(warningAlerts[0]);
      } else {
        // Send a summary notification for multiple warnings
        toast.warning(`⚠️ ${warningAlerts.length} Warnings`, {
          description: (
            <div className="space-y-1">
              {warningAlerts.map((alert, idx) => (
                <div key={idx} className="text-sm">
                  {alert.icon} {alert.parameter}: {alert.value.toFixed(1)}
                </div>
              ))}
            </div>
          ),
          duration: 8000,
        });
      }
    }
  }, [sendParameterAlert]);

  const sendSuccessNotification = useCallback((message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  }, []);

  const sendInfoNotification = useCallback((message: string) => {
    toast.info(message, {
      duration: 4000,
    });
  }, []);

  const value: NotificationContextType = {
    sendParameterAlert,
    sendMultipleAlerts,
    sendSuccessNotification,
    sendInfoNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
