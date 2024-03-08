import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

// Enable CORS for requests from your React application
app.use(cors({
  origin: 'https://haalcentraaltoservertest.azurewebsites.net' // Allow only your React app to access the server
}));

app.use(express.json()); // If you need to parse JSON request bodies

app.get('/', (req, res) => {
    res.send('Welcome to the backend server!');
  });

app.post('/get-bsn', async (req, res) => {
  // Define the URLs for the token and the BSN APIs
  const tokenUrl = 'https://trial-1299483.okta.com/oauth2/default/v1/token';
  const bsnApiUrl = 'https://brp-personen-v2.de-c1.cloudhub.io/haalcentraal/api/brp/personen';
  const brkApiUrl = 'https://brk-bevragen-v2.de-c1.cloudhub.io/esd-eto-apikey/bevragen/v2/kadastraalonroerendezaken/22310827210003?postcode=3011KD'; // Corrected URL
  const newBrkApiUrl = 'https://brk-bevragen-v2.de-c1.cloudhub.io/esd-eto-apikey/bevragen/v2/kadastraalonroerendezaken/22310827210003/hypotheken';

  // Set up the details for the token request
  const tokenParams = new URLSearchParams();
  tokenParams.append('client_id', '0oabz7rwpt4cqJ9Kt697');
  tokenParams.append('client_secret', '5dW6DDiPZLYSMRUXpzXABfPvmoiO9Ph8EJtOweZgElv2R46Wrrl_Es_3Ub8h-Fns');
  tokenParams.append('grant_type', 'client_credentials');
  tokenParams.append('scope', 'mulescope');

  try {
    // Request the OAuth token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      throw new Error(`HTTP error when fetching token! status: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log(access_token);

    // Now use the OAuth token to request the BSN
    const requestBody = {
      type: 'ZoekMetGeslachtsnaamEnGeboortedatum',
      fields: [
        'burgerservicenummer',
        'adressering',
        'adresseringBinnenland'
      ],
      geboortedatum: req.body.birthdate,
      geslachtsnaam: req.body.lastname
    };

    const bsnResponse = await fetch(bsnApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!bsnResponse.ok) {
      throw new Error(`HTTP error when fetching BSN! status: ${bsnResponse.status}`);
    }

    const bsnData = await bsnResponse.json();
    console.log(bsnData);

    // Make an extra GET call
    const brkResponse = await fetch(brkApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!brkResponse.ok) {
      throw new Error(`HTTP error when fetching brk Data! status: ${brkResponse.status}`);
    }

    const brkData = await brkResponse.json();
    console.log(brkData);

    const newBrkResponse = await fetch(newBrkApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!newBrkResponse.ok) {
      throw new Error(`HTTP error when fetching new brk Data! status: ${newBrkResponse.status}`);
    }

    const newBrkData = await newBrkResponse.json();
    console.log(newBrkData._embedded.hypotheken[0].hypotheekhouders[0].omschrijving);

    res.json({
      bsn: bsnData.personen[0].burgerservicenummer,
      straat: bsnData.personen[0].adressering.adresregel1,
      stad: bsnData.personen[0].adressering.adresregel2.split(' ')[3],
      huisnummer: bsnData.personen[0].adressering.adresregel1.split(' ')[1],
      postcode:
        bsnData.personen[0].adressering.adresregel2.split(' ')[0] +
        bsnData.personen[0].adressering.adresregel2.split(' ')[1],
      type: brkData.type, // Include extra data in the response
      hypotheekhouders: newBrkData._embedded.hypotheken[0].hypotheekhouders[0].omschrijving
    });
  } catch (error) {
    console.error('Error in /get-bsn:', error);
    res.status(500).send('Error fetching BSN');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});