import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "admin",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted(user) {
 // const result = await db.query(`SELECT country_code FROM visited_country where user_id = ${user}`);
   console.log(`SELECT country_code FROM visited_country JOIN users ON users.id = user_id where user_id = ${user}`);
  const result = await db.query(`SELECT country_code FROM visited_country JOIN users ON users.id = user_id where user_id = ${user}`);
  //const result = await db.query(`SELECT country FROM visited_country`);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function fetchUsers() {
  const result = await db.query("SELECT * FROM USERS");
  var users = [];
  result.rows.forEach((user) => {
    users.push(user.name);
  });
  
  return users;
}
let users = await fetchUsers ();
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  var user = req.body.user;
  
  const currentUser = await getCurrentUser();
  console.log(currentUser);
  const countries = await checkVisisted(currentUserId);
  console.log(countries);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  console.log(`input: ${input}`);
  if( input == '') {
    const countries = await checkVisisted(currentUserId);
    const currentUser = await getCurrentUser();
     console.log(currentUser);
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error : "Please enter a country"});
  }
  else {
    try {
      const result = await db.query(
        "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
        [input.toLowerCase()]
      );
  
      const data = result.rows[0];
      console.log(` data : ${data}`);
      const countryCode = data.country_code;
      console.log(` countryCode : ${countryCode}`);
      try {
        await db.query(
          "INSERT INTO visited_country (country_code,user_id) VALUES ($1,$2)",
          [countryCode,currentUserId]
        );
        res.redirect("/");
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      console.log(err);
      
    }
  }

  
});
app.post("/user", async (req, res) => {
  console.log("In USER");
  console.log(req.body);
  var user = req.body.user;
  var newUser = req.body.add;
  console.log(user);
  if (newUser == 'new') {
    res.render("new.ejs");
  } else {
    currentUserId  = user ;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {

  console.log("In New");
  console.log(req.body);
  var name = req.body.name;
  var color = req.body.color;
  try {
    var id = await db.query(
      "INSERT INTO users (name, color) VALUES ($1,$2) RETURNING id",
      [name,color]
    );

    currentUserId  = id.rows[0].id;
    console.log(`currentUserId:  ${currentUserId}`);
    res.redirect("/");

  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
