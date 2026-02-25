// Edit this file to set your movies and showtimes.
// capacity: max seats per showing (15 recommended)
// poster: URL to a movie poster image (portrait aspect ratio recommended)

const schedule = [
  {
    id: 'fri-eve',
    movie: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    date: 'Friday, March 20th',
    time: '7:30 PM',
    runtime: '2h 23m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/poHwCZeWzJCShH7tOjg8RIoyjcw.jpg'
  },
  {
    id: 'fri-late',
    movie: 'The Mask',
    date: 'Friday, March 20th',
    time: '10:15 PM',
    runtime: '1h 41m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/jPC2eYub74zwf2tPGVtzSlBW6Oy.jpg'
  },
  {
    id: 'sat-morn',
    movie: "Fantastic Mr. Fox",
    date: 'Saturday, March 21st',
    time: '11:00 AM',
    runtime: '1h 27m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/euZyZb6iGreujYKrGyZHRddhUYh.jpg'
  },
  {
    id: 'sat-lunch',
    movie: 'The Truman Show',
    date: 'Saturday, March 21st',
    time: '1:00 PM',
    runtime: '1h 43m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/vuza0WqY239yBXOadKlGwJsZJFE.jpg'
  },
  {
    id: 'sun-mat',
    movie: 'Fried Green Tomatoes',
    date: 'Saturday, March 21st',
    time: '3:15 PM',
    runtime: '2h 10m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/g71l1vbJwyAAYk8zKCkIQQ58qcb.jpg'
  },
  {
    id: 'sun-eve',
    movie: 'Notting Hill',
    date: 'Saturday, March 21st',
    time: '7:00 PM',
    runtime: '2h 4m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/hHRIf2XHeQMbyRb3HUx19SF5Ujw.jpg'
  },
  {
    id: 'sun-late',
    movie: "The Hunt for Red October",
    date: 'Saturday, March 21st',
    time: '9:30 PM',
    runtime: '2h 15m',
    capacity: 15,
    poster: 'https://image.tmdb.org/t/p/w500/yVl7zidse4KiWtGMqHFtZCx4X3N.jpg'
  }
]

export default schedule
