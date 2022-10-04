const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let app = express();
app.use(express.json());
let db = null;

let dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running successfully :3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authorization = (request, response, next) => {
  let jwtToken;
  const headerAuthor = request.headers["authorization"];
  if (headerAuthor !== undefined) {
    jwtToken = headerAuthor.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        console.log(jwtToken);
        response.status(401);
        console.log(jwtToken);
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        console.log(payload);
        next();
      }
    });
  }
};

//API-1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const usernameQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbUser = await db.get(usernameQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send(`Invalid user`);
    } else {
      const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatch === true) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send(`Invalid password`);
      }
    }
  } catch (e) {
    console.log(`${e.message}`);
    process.exit(1);
  }
});

app.get("/states/", authorization, async (request, response) => {
  const statesQuery = `
  SELECT *
   FROM state
    ORDER BY state_id ASC;`;
  const stateArray = await db.all(statesQuery);
  response.send(stateArray);
});

//API -3
app.get("/states/:stateId/", authorization, async (request, response) => {
  const { stateId } = request.params;
  const stateTableQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId};`;
  const dbResponse = await db.get(stateTableQuery);
  response.send(dbResponse);
});

//API-4
app.post("/districts/", authorization, async (request, response) => {
  try {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const addDistrictQuery = `
    INSERT INTO district(
        district_name,state_id,cases,cured,active,deaths
    )
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;

    const dbResponse = await db.run(addDistrictQuery);
    //const { district_id } = dbResponse.lastID;
    response.send("District Added successfully");
  } catch (e) {
    console.log(`${e.message}`);
  }
});

module.exports = app;
