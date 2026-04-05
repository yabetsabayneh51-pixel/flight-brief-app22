
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  SyncEngine.init();
  SyncEngine.pullData();
  
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed:', err));
  }

  Router.init();
});

const Router = {
  container: document.getElementById('view-container'),
  
  init() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
          b.classList.remove('bg-slate-700', 'text-white');
          b.classList.add('text-slate-400');
        });
        e.target.classList.add('bg-slate-700', 'text-white');
        this.navigate(e.target.dataset.view);
      });
    });
    this.navigate('dashboard');
  },

  async navigate(view) {
    this.container.innerHTML = '<div class="text-center mt-20"><span class="w-8 h-8 border-4 border-aviation-accent border-t-transparent rounded-full animate-spin inline-block"></span></div>';
    
    if (view === 'dashboard') await Views.renderDashboard(this.container);
    if (view === 'newBrief') await Views.renderNewBrief(this.container);
    if (view === 'cities') await Views.renderCities(this.container);
  }
};

const Views = {
  async renderDashboard(container) {
    const briefs = await DB.getAll('briefs');
    const queue = await DB.getAll('syncQueue');
    
    let html = `
      <div class="fade-in">
        <h2 class="text-3xl font-bold text-white mb-6">Active Flights</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-aviation-panel p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Briefs</div>
            <div class="text-4xl font-bold text-white">${briefs.length}</div>
          </div>
          <div class="bg-aviation-panel p-6 rounded-xl border border-slate-700 shadow-lg">
            <div class="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Pending Sync</div>
            <div class="text-4xl font-bold ${queue.length > 0 ? 'text-amber-400' : 'text-aviation-accent'}">${queue.length}</div>
          </div>
        </div>
        
        <h3 class="section-title">Recent Briefs</h3>
        <div class="bg-aviation-panel rounded-xl border border-slate-700 overflow-hidden">
          ${briefs.length === 0 ? '<div class="p-6 text-slate-400">No briefs found. Create one.</div>' : ''}
          ${briefs.reverse().slice(0, 10).map(b => `
            <div class="p-4 border-b border-slate-700 last:border-0 hover:bg-slate-800 transition flex justify-between items-center">
              <div>
                <span class="text-aviation-accent font-bold text-lg">${b.FlightNumber}</span>
                <span class="text-white ml-3 font-mono">${b.Departure} &rarr; ${b.DestinationICAO}</span>
              </div>
              <div class="text-sm text-slate-400">${b.Route || 'Direct'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  async renderCities(container) {
    const cities = await DB.getAll('cities');
    let html = `
      <div class="fade-in">
        <h2 class="text-3xl font-bold text-white mb-6">City Database</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${cities.map(c => `
            <div class="bg-aviation-panel p-5 rounded-xl border border-slate-700">
              <h4 class="text-xl font-bold text-aviation-accent mb-1">${c.DestinationICAO}</h4>
              <div class="text-white font-medium mb-3">${c.City}, ${c.Country}</div>
              <div class="text-sm text-slate-400"><strong class="text-slate-300">Hotel:</strong> ${c.HotelName || 'N/A'}</div>
              <div class="text-sm text-slate-400 mt-1"><strong class="text-slate-300">Transit:</strong> ${c.TransportTimeToHotel || 'N/A'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  async renderNewBrief(container) {
    const formHtml = `
      <div class="fade-in max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-white">Create Flight Brief</h2>
          <button id="saveBriefBtn" class="bg-aviation-accent hover:bg-emerald-400 text-slate-900 font-bold py-2 px-6 rounded-lg transition shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            SAVE BRIEF
          </button>
        </div>

        <form id="briefForm" class="space-y-8">
          <div>
            <h3 class="section-title">Flight Details</h3>
            <div class="form-grid">
              <div><label>Flight Number</label><input type="text" name="FlightNumber" required placeholder="e.g. UAL123"></div>
              <div><label>Route</label><input type="text" name="Route"></div>
              <div><label>Departure ICAO</label><input type="text" name="Departure" required class="uppercase" maxlength="4"></div>
              <div>
                <label class="flex justify-between">
                  <span>Destination ICAO</span>
                  <span id="icaoStatus" class="text-xs text-aviation-accent hidden">Auto-filled</span>
                </label>
                <input type="text" name="DestinationICAO" id="destIcaoInput" required class="uppercase font-bold text-aviation-accent" maxlength="4">
              </div>
            </div>
          </div>

          <div>
            <h3 class="section-title">Departure & Enroute</h3>
            <div class="form-grid">
              <div><label>Dep SID</label><input type="text" name="DepSID"></div>
              <div><label>Dep Frequency</label><input type="text" name="DepFrequency"></div>
              <div><label>Noise Abatement</label><input type="text" name="NoiseAbatement"></div>
              <div><label>Engine Out Proc</label><input type="text" name="EngineOut"></div>
              <div class="md:col-span-2"><label>Departure Notes</label><textarea name="DepAirportNotes" rows="2"></textarea></div>
              <div class="md:col-span-2"><label>Enroute Notes</label><textarea name="EnrouteNotes" rows="2"></textarea></div>
            </div>
          </div>

          <div>
            <h3 class="section-title">Arrival Ops</h3>
            <div class="form-grid">
              <div><label>Arrival STAR</label><input type="text" name="ArrivalStar"></div>
              <div><label>Opps Freq</label><input type="text" name="ArrivalOppsFreq"></div>
              <div><label>Expected Taxi</label><input type="text" name="ExpectedTaxi"></div>
              <div><label>Gate</label><input type="text" name="Gate"></div>
              <div class="md:col-span-2"><label>Arrival Notes</label><textarea name="ArrivalAirportNotes" rows="2"></textarea></div>
            </div>
          </div>

          <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 class="text-xl text-white border-b border-slate-600 pb-2 mb-4">Destination & Layover Info</h3>
            <div class="form-grid" id="layoverFields">
              <div><label>Country</label><input type="text" name="CityCountry" class="auto-field"></div>
              <div><label>City</label><input type="text" name="City" class="auto-field"></div>
              <div><label>Timezone</label><input type="text" name="Timezone" class="auto-field"></div>
              <div><label>Transport to Hotel</label><input type="text" name="TransportTimeToHotel" class="auto-field"></div>
              <div><label>Hotel Name</label><input type="text" name="HotelName" class="auto-field"></div>
              <div><label>Terminal Exit</label><input type="text" name="TerminalExit"></div>
              <div class="md:col-span-2"><label>Hotel Location</label><input type="text" name="HotelLocation" class="auto-field"></div>
              <div class="md:col-span-2"><label>Amenities</label><textarea name="HotelAmenities" rows="2" class="auto-field"></textarea></div>
              <div class="md:col-span-2"><label>Things To Do</label><textarea name="ThingsToDo" rows="2" class="auto-field"></textarea></div>
              <div class="md:col-span-2"><label>Shopping Areas</label><textarea name="ShoppingAreas" rows="2" class="auto-field"></textarea></div>
            </div>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = formHtml;
    this.bindFormEvents();
  },

  bindFormEvents() {
    const destInput = document.getElementById('destIcaoInput');
    const autoFields = document.querySelectorAll('.auto-field');
    const statusText = document.getElementById('icaoStatus');

    // Autofill Logic
    destInput.addEventListener('keyup', async (e) => {
      const val = e.target.value.toUpperCase();
      if (val.length === 4) {
        const city = await DB.get('cities', val);
        if (city) {
          statusText.classList.remove('hidden');
          // Map City DB fields to Form fields
          const mappings = {
            Country: 'CityCountry', City: 'City', Timezone: 'Timezone', 
            TransportTimeToHotel: 'TransportTimeToHotel', HotelName: 'HotelName',
            Location: 'HotelLocation', Amenities: 'HotelAmenities', 
            ThingsToDo: 'ThingsToDo', ShoppingAreas: 'ShoppingAreas'
          };
          
          for (const [dbKey, formKey] of Object.entries(mappings)) {
            const input = document.querySelector(`[name="${formKey}"]`);
            if (input && city[dbKey]) {
              input.value = city[dbKey];
              input.classList.add('autofill-highlight');
              setTimeout(() => input.classList.remove('autofill-highlight'), 1500);
            }
          }
        } else {
          statusText.classList.add('hidden');
          autoFields.forEach(f => f.value = ''); // Clear if not found
        }
      }
    });

    // Save Logic
    document.getElementById('saveBriefBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      const form = document.getElementById('briefForm');
      if(!form.reportValidity()) return;

      const formData = new FormData(form);
      const data = { id: Date.now().toString() };
      formData.forEach((value, key) => data[key] = value);
      
      // Save locally instantly
      await DB.put('briefs', data);
      
      // Add to sync queue & trigger push
      await DB.queueSyncItem('create_brief', data);
      SyncEngine.pushQueue();

      alert("Brief saved successfully!");
      Router.navigate('dashboard');
    });
  }
};
