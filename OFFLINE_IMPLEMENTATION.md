# Offline POS Implementation Guide

## Overview
The POS system implements a **Level 2 Offline (Read-Write)** capability. This ensures business continuity by allowing cashiers to process sales even without an internet connection. Data is synchronized with the server automatically when connectivity is restored.

## Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **`idb`** | `^8.0.3` | A Promise-based wrapper for IndexedDB. Handles local storage of products and pending sales. |
| **`vite-plugin-pwa`** | `^1.2.0` | Handles the Application Shell (HTML/JS/CSS) caching and Installability. |
| **`react-hot-toast`** | `^2.6.0` | Provides non-intrusive notifications (e.g., "Offline mode", "Syncing..."). |
| **`axios`** | `^1.6.7` | Handles HTTP requests. Offline logic is triggered when Axios calls fail. |

## Architecture & Workflow

### 1. Application Shell (PWA Layer)
**Tool**: `vite-plugin-pwa`
- **Role**: Ensures the application *loads* when offline.
- **Mechanism**:
  - Uses a Service Worker (Workbox) to cache static assets (`js`, `css`, `html`, `png`).
  - Provides a `manifest.webmanifest` allowing the app to be installed on the desktop/mobile home screen.
  - configured with `registerType: 'autoUpdate'` for seamless updates.

### 2. Database Initialization (Data Layer)
**Tool**: `idb` (IndexedDB)
- **Location**: `frontend/src/lib/offlineDb.js`.
- **Role**: Stores dynamic business data.
- **Stores**:
  - `products`: Caches the full product catalog (including batches and barcodes).
  - `pendingSales`: Queues sales transactions created while offline.

### 3. Data Caching (Read Strategy)
**Location**: `frontend/src/pages/pos/POSPage.jsx`.
- **Online Boot**: Fetches data from `/api/pos/products` and immediately saves it to IndexedDB via `cacheProducts()`.
- **Offline Boot**: If the API call fails or the device is offline, falls back to `getCachedProducts()` to load data from local storage.

### 4. Transaction Handling (Write Strategy)
When a sale is confirmed:
1.  **Attempt**: Tries to POST to `/api/pos/sales`.
2.  **Fallback**: If the network fails:
    -   Catches the error.
    -   Calls `savePendingSale()` to store the transaction in `pendingSales`.
    -   Notifies the user: "Offline: Sale saved locally".
    -   Clears the cart to allow the next customer.

### 5. Synchronization
- **Trigger**: Automatically runs when the device comes online or when the page loads with pending items.
- **Process**:
    -   Reads all items from `pendingSales`.
    -   Iterates and sends them to the server.
    -   On success, deletes the local record using `removePendingSale()`.
    -   Updates the sync count and UI.
