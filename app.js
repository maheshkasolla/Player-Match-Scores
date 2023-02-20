const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("sever is running http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API-1

//convert to object
const convertPlayerDBObject = (obj) => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  };
};

//GET Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
    SELECT * 
        FROM player_details;`;
  const getAllPlayersResponse = await db.all(getAllPlayersQuery);
  response.send(
    getAllPlayersResponse.map((eachPlayer) => convertPlayerDBObject(eachPlayer))
  );
});
///API 2
///GET  Return a specific player bases on the playerId

app.get("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const dbResponse = await db.get(getPlayerIdQuery);
  response.send(convertPlayerDBObject(dbResponse));
});

///API 3
///PUT update the details
app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const putPlayerDetailsQuery = `UPDATE player_details SET player_name='${playerName}'
  WHERE player_id=${playerId}`;
  const dnResponse = await db.run(putPlayerDetailsQuery);
  response.send("Player Details Updated");
});
///API 4
//get return all math details

const returnMatchDetails = (player) => {
  return {
    matchId: player.match_id,
    match: player.match,
    year: player.year,
  };
};
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchIdQuery = `SELECT * FROM match_details WHERE match_id=${matchId};`;
  const dbResponse = await db.get(getMatchIdQuery);
  response.send(returnMatchDetails(dbResponse));
});
///API5

//GET Returns a list of all the matches of a player

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `
    SELECT *
        FROM player_match_score
    WHERE 
        player_id=${playerId};`;

  const getMatchesOfPlayerDBResponse = await db.all(getMatchesOfPlayerDBQuery);
  const matchesIdArr = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArr});`;

  const fetchMatchDetailsResponse = await db.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) => returnMatchDetails(eachMatch))
  );
});

//API-6
//GET Returns a list of players of a specific match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `
    SELECT *
        FROM player_match_score
            NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await db.all(getPlayersOfMatchQuery);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) =>
      convertPlayerDBObject(eachPlayer)
    )
  );
});

//API-7

//convert player stats to object
const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

//GET Returns the statistics of the total score, fours, sixes
//  of a specific player based on the player ID

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await db.get(getPlayerStatisticsQuery);
  response.send(
    playerStatsObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});
module.exports = app;
