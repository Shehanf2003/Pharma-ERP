# Offline POS Implementation Guide

## Overview
The POS system implements a **Level 2 Offline (Read-Write)** capability. This ensures business continuity by allowing cashiers to process sales even without an internet connection. Data is synchronized with the server automatically when connectivity is restored.

## Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **`idb`** | `^8.0.3` | A Promise-based wrapper for IndexedDB. Handles local storage of products and pending sales. |
| **`react-hot-toast`** | `^2.6.0` | Provides non-intrusive notifications (e.g., "Offline mode", "Syncing..."). |
| **`axios`** | `^1.6.7` | Handles HTTP requests. Offline logic is triggered when Axios calls fail. |
| **`lucide-react`** | `^0.562.0` | Provides UI icons (`Wifi`, `WifiOff`, `RefreshCw`) for status indication. |

## Architecture & Workflow

### 1. Database Initialization
Located in `frontend/src/lib/offlineDb.js`.
- Creates a persistent IndexedDB database named `pos-db`.
- **Stores**:
  - `products`: Caches the full product catalog (including batches and barcodes).
  - `pendingSales`: Queues sales transactions created while offline.

### 2. Data Caching (Read Strategy)
Located in `frontend/src/pages/pos/POSPage.jsx`.
- **Online Boot**: Fetches data from `/api/pos/products` and immediately saves it to IndexedDB via `cacheProducts()`.
- **Offline Boot**: If the API call fails or the device is offline, falls back to `getCachedProducts()` to load data from local storage.

### 3. Offline Detection
- Uses `window.addEventListener` for `online` and `offline` events.
- Updates the `isOffline` state to toggle UI indicators (Green/Red WiFi icon).

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
