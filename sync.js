
// REPLACE THIS WITH YOUR GAS WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzAgTASBUwNNZKTbMiJ_wzHBFdSJOLdxVvIuSnvRUQQEZqA19GV0d6o441Yn-Q1bH_YCw/exec';

class SyncEngine {
  static async pullData() {
    if (!navigator.onLine) return;
    try {
      const response = await fetch(`${API_URL}?action=getData`);
      const data = await response.json();
      
      await DB.clear('briefs');
      await DB.clear('cities');
      
      for (let b of data.briefs) await DB.put('briefs', b);
      for (let c of data.cities) await DB.put('cities', c);
      
      window.dispatchEvent(new Event('data-updated'));
    } catch (e) {
      console.error('Pull failed:', e);
    }
  }

  static async pushQueue() {
    if (!navigator.onLine) return;
    
    const queue = await DB.getAll('syncQueue');
    if (queue.length === 0) return;

    SyncEngine.showToast(`Syncing ${queue.length} items...`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'sync', payload: queue })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        await DB.clear('syncQueue');
        SyncEngine.showToast('Sync complete!');
        setTimeout(() => document.getElementById('sync-toast').classList.replace('translate-y-0', 'translate-y-20'), 2000);
        await this.pullData(); // Refresh to get proper IDs/timestamps
      }
    } catch (e) {
      console.error('Push failed:', e);
      SyncEngine.showToast('Sync failed, will retry later.');
    }
  }

  static showToast(msg) {
    const t = document.getElementById('sync-toast');
    t.innerText = msg;
    t.classList.replace('translate-y-20', 'translate-y-0');
  }

  static init() {
    window.addEventListener('online', () => {
      document.getElementById('network-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500"></span> Online';
      this.pushQueue();
    });
    window.addEventListener('offline', () => {
      document.getElementById('network-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Offline';
    });
    
    document.getElementById('sync-btn').addEventListener('click', () => {
      this.pushQueue();
      this.pullData();
    });

    // Auto-sync every 30 seconds if online
    setInterval(() => this.pushQueue(), 30000);
  }
}
