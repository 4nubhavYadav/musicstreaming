/**
 * In-App APK Updater Service
 *
 * Checks version.json on launch, compares versionCode, and drives the APK download & install flow.
 */

import { Capacitor } from '@capacitor/core';
import { isNativeApp } from './nativeBridge.js';

let AppUpdater = null;

export async function checkAppUpdate() {
  if (!isNativeApp()) return null;

  try {
    AppUpdater = Capacitor.Plugins.AppUpdater;
    if (!AppUpdater) return null;

    // 1. Fetch remote version manifest
    const res = await fetch('/version.json?t=' + Date.now());
    if (!res.ok) return null;
    const remote = await res.json();

    // 2. Query native installed version
    const installed = await AppUpdater.getInstalledVersion();
    if (!installed || !installed.versionCode) return null;

    if (remote.versionCode > installed.versionCode) {
      return {
        updateAvailable: true,
        remoteVersionCode: remote.versionCode,
        remoteVersionName: remote.versionName,
        apkUrl: remote.apkUrl,
        notes: remote.notes || 'A new version of Sora is available.',
        currentVersionName: installed.versionName
      };
    }
  } catch (err) {
    console.warn('[AppUpdater] Check notice:', err.message);
  }

  return null;
}

export async function performApkUpdate(apkUrl, onProgress) {
  if (!AppUpdater) return false;

  try {
    // Check permission to install unknown apps (Android 8.0+)
    const permRes = await AppUpdater.canRequestPackageInstalls();
    if (permRes && permRes.canInstall === false) {
      await AppUpdater.openInstallPermissionSettings();
      return false;
    }

    let progressListener = null;
    if (onProgress) {
      progressListener = await AppUpdater.addListener('downloadProgress', (data) => {
        onProgress(data.percent || 0, data.downloadedBytes, data.totalBytes);
      });
    }

    await AppUpdater.downloadAndInstallApk({ apkUrl });

    if (progressListener) {
      await progressListener.remove();
    }
    return true;
  } catch (err) {
    console.warn('[AppUpdater] Install error:', err);
    throw err;
  }
}
