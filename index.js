import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3060;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "learn",
  password: "Jyotsana2001#",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let cuseid = 1;

let users = [
  { id: 2, name: "Jyotsana", color: "teal" }];

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_country JOIN users ON users.id = visited_country.user_id WHERE user_id = $1;",
    [cuseid]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

/*async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == cuseid);
}

 app.get("/", async (req, res) => {
  const countries = await checkVisited();

  const cuse = users.find((user) => user.id == cuseid) || {
    color: "yellow",
  };
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: cuse.color,
  });
});*/


async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;  // Update the global 'users' array with the latest data
  return users.find((user) => user.id == cuseid);  // Return the current user
}

app.get("/", async (req, res) => {
  try {
    // Fetch the updated users list from the database
    await getCurrentUser();

    const countries = await checkVisited();
    
    // Find the current user from the fresh list
    const cuse = users.find((user) => user.id == cuseid) || {
      color: "yellow",
    };

    // Render the updated list of users
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users, // Ensure this is the latest list
      color: cuse.color,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading users.");
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const cuse = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    // Check if the country is already in the visited countries list
    const isCountryVisited = await db.query(
      "SELECT 1 FROM visited_country WHERE user_id = $1 AND country_code = $2",
      [cuseid, countryCode]
    );

    if (isCountryVisited.rows.length > 0) {
      
      console.log(`Country '${input}' is already added.`);
  
      return res.render("index.ejs", {
        countries: await checkVisited(),
        total: (await checkVisited()).length,
        users,
        color: cuse.color,
        error: `Country '${input}' already added!`,
      });
    } else {
      // Country is not in the list, proceed with the insertion
      await db.query(
        "INSERT INTO visited_country (country_code, user_id) VALUES ($1, $2)",
        [countryCode, cuseid]
      );
    }

    // Redirect to the home page
    res.redirect("/");
  } catch (err) {
    console.log(err);

    // Handle other errors as needed
    const countries = await checkVisited();
   
console.log('Visited Countries:', countries);
console.log('Current User:', cuseid, 'User Color:', cuse.color);

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users,
      color: cuse.color,
      error: "Error adding country!",
    });
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs");
  } else {
    cuseid = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  if (!color) {
    // If color is missing or empty, handle the error
    return res.render("new.ejs", {
      error: "Color is required.",
    });
  }
  try {
    
    const existingUser = await db.query("SELECT * FROM users WHERE name = $1", [name]);

    if (existingUser.rows.length > 0) {
      
      console.log(`User '${name}' already exists.`);
      
      return res.render("index.ejs", {
        countries: await checkVisited(),
        total: (await checkVisited()).length,
        users,
        color: cuse.color,
        error: `User '${name}' already exists!`,
      });
    }

    // If the user does not exist, proceed with the insertion
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
      [name, color]
    );

    const id = result.rows[0].id;
    cuseid = id;
 
    await getCurrentUser();
    
    res.redirect("/");
  } catch (err) {
    console.log(err);

    // Handle other errors as needed
    const countries = await checkVisited();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users,
      color: cuse.color,
      error: "Error adding user!",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
