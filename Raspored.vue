<template>
  <div>
    <h2>Schedule Table</h2>
    
    <!-- Input for search -->
    <input 
      type="text" 
      v-model="searchTerm" 
      placeholder="Pretraži po imenu profesora" 
    />
    
    <table border="1">
      <thead>
        <th>Redni broj časa</th>
        <th>Ponedeljak</th>
        <th>Utorak</th>
        <th>Sreda</th>
        <th>Četvrtak</th>
        <th>Petak</th>
        +
      </thead>
      <tbody>
        <!-- Use filteredSchedule instead of raspored -->
        <tr v-for="(item, index) in filteredSchedule" :key="index">
            <!-- Calculate redni broj časa for each pro_id and dan_id -->
            <td>{{ getLessonNumber(item) }}</td> <!-- Redni broj časa -->
            
          
                    <td>{{ item.pro_ime }}</td>
                    
          
                    <td>{{ item.prd_naziv }}</td>
                    <td>{{ item.ode_naziv }}</td>
         
                    <td>{{ getLessonNumber(item) }}</td> <!-- Redni broj časa -->
         
         
          <td>{{ item.dan_naziv }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      schedule: [], // Store fetched schedule data here
     
      searchTerm: '' // Input for search term
    };
  },
  created() {
    this.fetchSchedule();
  },
  computed: {
  filteredSchedule() {
    const filtered = this.schedule.filter(item => {
      if (item.pro_ime) { // Proverite da li item.pro_ime postoji
        return item.pro_ime.toLowerCase().includes(this.searchTerm.toLowerCase());
      } else {
        console.warn('Stavka nema pro_ime:', item); // Log upozorenje ako nema pro_ime
        return false;
      }
    });

    console.log('Filtered Results:', filtered);
    return filtered;
  }
},
methods: {
  async fetchSchedule() {
    try {
      const uniqueParam = new Date().getTime(); // Dodaj jedinstveni parametar za izbegavanje keširanja
      const response = await axios.get('http://localhost:3028/raspored/', {
        params: {
          proNaziv: this.searchTerm,
          _t: uniqueParam // Dodaj jedinstveni query parametar
        }
      });

      console.log('API Response:', response.data); // Proveri strukturu podataka

      // Proveri da li je response.data.schedule niz
      if (Array.isArray(response.data.schedule)) {
        // Generišite prilagođeni raspored
        const customSchedule = this.generateCustomSchedule(response.data.schedule);
        
        // Izračunajte brojeve časova za raspored
        this.schedule = this.calculateLessonNumbers(customSchedule);
      } else {
        console.error('Expected schedule to be an array, but got:', response.data);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    }
  },

  // Nova funkcija za generisanje prilagođenog rasporeda
  generateCustomSchedule(schedule) {
    console.log('Schedule Data:', schedule);
    const groupedByProId = this.groupBy(schedule, 'pro_id');
    const result = [];

    for (const [proId, items] of Object.entries(groupedByProId)) {
      const intProId = parseInt(proId, 10);

      if (intProId === 2) {
        result.push(...this.scheduleWithFreeDay(items));
      } else if (intProId === 29 || intProId === 30) {
        result.push(...this.scheduleWithBlockClasses(items, 2));
      } else if (intProId === 8 || intProId === 9) {
        result.push(...this.scheduleWithBlockClasses(items, 5));
      } else {
        result.push(...items);
      }
    }

    return result;
  },

  // Funkcija za kreiranje rasporeda sa slobodnim danom između
  scheduleWithFreeDay(items) {
    const schedule = [];
    let freeDay = true;

    for (let i = 0; i < items.length; i++) {
      if (freeDay && i % 2 === 0) {
        schedule.push({
          ...items[i],
          dan_id: i % 5 + 1
        });
      } else {
        schedule.push(items[i]);
      }
      freeDay = !freeDay;
    }

    return schedule;
  },

  // Funkcija za kreiranje rasporeda sa blok časovima
  scheduleWithBlockClasses(items, totalDays) {
    const schedule = [];
    let dayIndex = 1;

    for (let i = 0; i < items.length; i += 2) {
      const firstClass = items[i];
      const secondClass = items[i + 1] || { ...firstClass };

      firstClass.dan_id = dayIndex;
      secondClass.dan_id = dayIndex;

      schedule.push(firstClass, secondClass);

      dayIndex++;
      if (dayIndex > totalDays) {
        dayIndex = 1;
      }
    }

    return schedule;
  },

  // Pomoćna funkcija za grupisanje po pro_id
  groupBy(array, key) {
    return array.reduce((result, item) => {
      if (item[key] !== undefined) {
        (result[item[key]] = result[item[key]] || []).push(item);
      } else {
        console.warn(`Item does not have the key ${key}:`, item);
      }
      return result;
    }, {});
  },

  // Metoda za izračunavanje broja časa za svaki predmet
  calculateLessonNumbers(schedule) {
    const lessonCounters = {};
    return schedule.map(item => {
      const key = `${item.pro_id}-${item.dan_id}`;

      // Inicijalizujte brojače za pro_id i dan_id ako već nije učinjeno
      if (!lessonCounters[key]) {
        lessonCounters[key] = 1;
      } else {
        lessonCounters[key] += 1;
      }

      // Ograničite broj časova na maksimalno 8
      const limitedLessonNumber = Math.min(lessonCounters[key], 8);

      // Vratite predmet sa izračunatim brojem časa
      return { ...item, lessonNumber: limitedLessonNumber };
    });
  },
  // Method to get lesson number for an item
  getLessonNumber(item) {
    return item.lessonNumber || 0;
  }
}}
</script>



<style scoped>
/* Optional: Add some basic styling */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px;
  text-align: left;
}
</style>