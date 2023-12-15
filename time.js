const fs = require('fs')
const path = require('path')

const info = {
  path: process.argv[2],
  id: process.argv[3],
  start: process.argv[4],
  end: process.argv[5]
}

const time = (value) => {
  return new Date(value)
}

const calcTime = (value1, value2, value3) => {
  if (value3 === 'hours') {
    return Math.floor((time(value1) - time(value2)) / (1000 * 60 * 60))
  } else if (value3 === 'minutes') {
    return Math.floor((time(value1) - time(value2)) % (1000 * 60 * 60) / (1000 * 60))
  }
}

const main = async () => {

  // I get the path where the .csv file is located.
  const pathname = path.join(__dirname, info.path)

  // I read the .csv file, and as we know, a CSV file typically has the column headers in the first line and the values for each column in the subsequent lines. 
  // The value returned by fs.readFileSync() will be a string. 
  // So, what I need to do is split the string at the line breaks, but before that, remove the '\r' that appears at the end of each line. 
  // This way, we'll end up with an array
  const file = fs.readFileSync(pathname, 'utf-8')
  const list = file.replace(/\r/g, '').split('\n')

  // Actually, I managed to figure it out here. I created this way to obtain an array of objects, 
  // where each object contains the information from each row according to its column value. 
  // Basically, I converted the .csv file into something akin to a JSON, so I can read and filter the information as needed. 
  // I know I might not have done it in the best way; perhaps, if I spend more time on it, 
  // I could create a method that, based on the value of each column, will generate the 'JSON'. 
  // Here, I did it manually, so to speak
  const infoList = list.map((row, i) => {
    if (i === 0) return
    if (i === list.length - 1) return
    return {
      user_id: row.split(',')[0],
      location_name: row.split(',')[1],
      coordinates_latitude: row.split(',')[2],
      coordinates_longitude: row.split(',')[3],
      timestamp: row.split(',')[4],
      event_type: row.split(',')[5]
    }
  }).filter(value => value !== undefined)

  // Thanks to what I did earlier, I can filter the information according to the user ID and the time interval.
  const userInfoById = infoList.filter(value => {
    const timeUser = time(value.timestamp)
    const timeStart = time(info.start)
    const timeEnd = time(info.end)

    const timeFilter1 = timeUser <= timeEnd
    const timeFilter2 = timeUser >= timeStart

    return value.user_id === info.id && timeFilter1 && timeFilter2
  })

  // I check if the worker (user) registered their home, and therefore, 
  //we'll need to count the hours they spend traveling to the place where they'll be taking care of the person as well.
  const haveAHome = userInfoById.some(value => value.location_name === 'HOME')

  let timeLeaveHome
  let timeEnterWork
  let timeLeaveWork
  let timeEnterHome

  // If they have to travel, I'll count the time it takes for the journey. If not, then I won't count it.
  if (haveAHome) {
    userInfoById.forEach((value, i) => {
      if (value.location_name === 'HOME' && value.event_type === 'LEAVE') {
        timeLeaveHome = value.timestamp
      }

      if (value.location_name != 'HOME' && value.event_type === 'ENTER') {
        timeEnterWork = value.timestamp
      }

      if (value.location_name != 'HOME' && value.event_type === 'LEAVE') {
        timeLeaveWork = value.timestamp
      }

      if (value.location_name === 'HOME' && value.event_type === 'ENTER') {
        timeEnterHome = value.timestamp
      }
    })

    // I calculate the hours and minutes they worked.
    const hours = calcTime(timeEnterHome, timeLeaveHome, 'hours')
    const minutes = calcTime(timeEnterHome, timeLeaveHome, 'minutes')

    // And the hours and minutes it took for the travel.
    const hoursT = Math.floor(((time(timeEnterWork) - time(timeLeaveHome)) + (time(timeEnterHome) - time(timeLeaveWork))) / (1000 * 60 * 60))
    const minutesT = Math.floor((time(timeEnterWork) - time(timeLeaveHome) + (time(timeEnterHome) - time(timeLeaveWork))) % (1000 * 60 * 60) / (1000 * 60))

    // Here is the solution when a home is registered.
    const solution =
      `The user with id ${info.id} spent ${hours === 0 ? "" : hours + (hours === 1 ? " hour" : " hours")}${minutes === 0 ? "" : (hours === 0 ? "" : " and ") + minutes + " minutes"} performing caregiving duties between ${info.start} and ${info.end}, of which ${hoursT === 0 ? "" : hoursT + (hoursT === 1 ? " hour" : " hours")} ${minutesT === 0 ? "" : "and " + minutesT + " minutes"} was spent travelling.`
    console.log(solution)

  } else {

    userInfoById.forEach(value => {
      if (value.event_type === 'ENTER') {
        timeEnterWork = value.timestamp
      }

      if (value.event_type === 'LEAVE') {
        timeLeaveWork = value.timestamp
      }
    })

    const hours = calcTime(timeLeaveWork, timeEnterWork, 'hours')
    const minutes = calcTime(timeLeaveWork, timeEnterWork, 'minutes')

    // Here is the solution when a home is not registered.
    const solution =
      `The user with id ${info.id} spent ${hours === 0 ? "" : hours + (hours === 1 ? " hour" : " hours")}${minutes === 0 ? "" : (hours === 0 ? "" : " and ") + minutes + " minutes"} performing caregiving duties between ${info.start} and ${info.end}`
    console.log(solution)
  }
}

main()
