const maleNames = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Thomas", "Chris", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven",
  "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Timothy",
  "Ronald", "Jason", "Edward", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas",
  "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin",
  "Samuel", "Raymond", "Gregory", "Frank", "Alexander", "Patrick", "Jack", "Dennis",
  "Jerry", "Tyler", "Aaron", "Jose", "Adam", "Nathan", "Henry", "Douglas", "Zachary",
  "Peter", "Kyle", "Noah", "Ethan", "Jeremy", "Walter", "Christian", "Keith", "Roger",
  "Terry", "Austin", "Sean", "Gerald", "Carl", "Harold", "Dylan", "Arthur", "Lawrence",
  "Jesse", "Jordan", "Bryan", "Billy", "Bruce", "Gabriel", "Joe", "Logan", "Alan",
  "Juan", "Wayne", "Roy", "Ralph", "Randy", "Eugene", "Vincent", "Russell", "Louis",
  "Philip", "Bobby", "Johnny", "Bradley", "Liam", "Mason", "Oliver", "Lucas", "Leo",
  "Mateo", "Jayden", "Carter", "Owen", "Wyatt", "Cole", "Hunter", "Blake", "Cameron",
  "Derek", "Travis", "Shawn", "Marcus", "Trevor", "Corey", "Shane", "Brett", "Joel",
];

const suffixes = ["", "92", "x", "99", "23", "07", "88", "21", "pro", "real"];

export function getRandomMaleUsername(): string {
  const name = maleNames[Math.floor(Math.random() * maleNames.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${name}${suffix}`;
}
