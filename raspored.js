var mysql = require("mysql");
const cors = require('cors');
var express = require("express");
var app = express();

var port = 3028;
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
   // res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' http://localhost:3028");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    port: '3306',
    password: "root123",
    database: "mi_baza"
});

// Povezivanje na bazu podataka
conn.connect(function(err) {
    if (err) {
        console.error('Greška pri povezivanju sa bazom podataka: ' + err.stack);
        return;
    }
    console.log('Povezano sa bazom podataka kao ID ' + conn.threadId);
});


// Funkcija za dobavljanje svih podataka iz tabele kabinpredmet
// Funkcija za dobavljanje svih podataka iz tabele kabinpredmet
function getScheduleData(proId) {
    return new Promise((resolve, reject) => {
        // Upit za raspored
        const query = `
            SELECT 
                predmode.pro_id,
                profesori.pro_ime,
                odeljenje.ode_naziv,
                predmeti.prd_naziv,
                predmode.brcas,
                dani.dan_naziv 
            FROM 
                predmode
            INNER JOIN 
                profesori ON predmode.pro_id = profesori.pro_id
            INNER JOIN 
                odeljenje ON predmode.ode_id = odeljenje.ode_id
            INNER JOIN 
                predmeti ON predmode.prd_id = predmeti.prd_id
            INNER JOIN 
                profdan ON predmode.pro_id = profdan.pro_id
            INNER JOIN 
                dani ON profdan.dan_id = dani.dan_id
            ORDER BY 
                predmode.pro_id, odeljenje.ode_naziv, dani.dan_naziv;
        `;

        // Upit za ukupne časove po predmetu
        const getTotalClassesQuery = `
            SELECT 
                predmode.prd_id,
                SUM(predmode.brcas) AS total_classes_per_subject
            FROM 
                predmode
            GROUP BY 
                predmode.prd_id;
        `;

        // Upit za maksimalan broj časova po predmetu
        const getMaxClassesQuery = `
            SELECT 
                predmode.prd_id,
                MAX(predmode.brcas) AS max_classes_per_subject
            FROM 
                predmode
            GROUP BY 
                predmode.prd_id;
        `;

        // Izvršite sve upite
        conn.query(getTotalClassesQuery, (error, totalClassesResults) => {
            if (error) return reject(error);

            conn.query(getMaxClassesQuery, (error, maxClassesResults) => {
                if (error) return reject(error);

                // Kombinujte rezultate
                const combinedResults = totalClassesResults.map(total => {
                    const max = maxClassesResults.find(item => item.prd_id === total.prd_id);
                    return {
                        prd_id: total.prd_id,
                        total_classes_per_subject: total.total_classes_per_subject,
                        max_classes_per_subject: max ? max.max_classes_per_subject : null
                    };
                }).filter(result => result.total_classes_per_subject <= result.max_classes_per_subject);

                // Izvršite upit za raspored
                const params = proId ? [proId] : [];
                conn.query(query, params, (error, results) => {
                    if (error) return reject(error);

                    // Kombinujte rezultate sa rasporedom
                    const finalResults = results.map(item => ({
                        ...item,
                        combinedResults
                    }));

                    resolve(finalResults);
                });
            });
        });
    });
}

// Koristite funkciju
getScheduleData(1)
    .then(results => console.log(results))
    .catch(error => console.error('Error:', error));
// Ruta za generisanje i dobijanje rasporeda
app.get('/raspored/', async (req, res) => {
    const proId = req.query.proId; // Opcioni query parametar
    const proNaziv = req.query.proNaziv; // Dodajte novi opcioni parametar za search po nazivu

    try {
        const scheduleData = await getScheduleData(proId);
        res.json({ schedule: scheduleData });
    } catch (error) {
        console.error('Error while fetching schedule data:', error);
        res.status(500).json({ error: 'Internal server error while fetching schedule data' });
    }
});
app.get('/profdan', (req, res) => {
    const query = 'SELECT * FROM profdan';

    conn.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching days:', error);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results);
        }
    });
});


app.listen(port, function() {
    console.log("Server listening on port " + port);
});