const AWS = require("aws-sdk");
const express = require("express");
const serverless = require("serverless-http");
const {v4: uuidv4} = require('uuid');
const {generateUpdateQuery} = require("./helper/generateUpdateQuery");

const app = express();
app.use(express.json());

const USERS_TABLE = process.env.USERS_TABLE;


const dynamoDbClientParams = {};
if (process.env.IS_OFFLINE) {
  dynamoDbClientParams.region = 'localhost'
  dynamoDbClientParams.endpoint = 'http://localhost:8000'
}
const dynamoDbClient = new AWS.DynamoDB.DocumentClient(dynamoDbClientParams);

const userId = uuidv4()

app.get("/users", async function (req, res) {
  try {
    // throw new Error('new ERROR')
    const {Items} = await dynamoDbClient.scan({TableName: USERS_TABLE}).promise();
    if (Items) {
      const users = Items;
      res.json({users});
    } else {
      res
        .status(404)
        .json({error: 'Could not find users'});
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Could not retrieve user"});
  }
});

app.post("/users", async function (req, res) {
  const {name} = req.body;
  if (typeof name !== "string") {
    res.status(400).json({error: '"name" must be a string'});
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.json({userId, name, msg: 'User was added'});
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Could not create user"});
  }
});

app.get("/users/:userId", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const {Item} = await dynamoDbClient.get(params).promise();
    if (Item) {
      const {userId, name} = Item;
      res.json({userId, name});
    } else {
      res
        .status(404)
        .json({error: 'Could not find user with provided "userId"'});
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Could not retrieve user"});
  }
});

app.put("/users/:userId", async function (req, res) {
  const data = req.body

  const expression = generateUpdateQuery(data)

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
    ...expression,
    ReturnValues: 'ALL_NEW'
  };

  try {
    const {Attributes} = await dynamoDbClient.update(params).promise();
    if (Attributes) {
      const {userId, name} = Attributes;
      res.json({userId, name, msg: 'User was updated'});
    } else {
      res
        .status(404)
        .json({error: 'Could not find user with provided "userId"'});
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "Could not retrieve user"});
  }
});

app.delete("/users/:userId", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const {Item} = await dynamoDbClient.get(params).promise();
    if (Item) {
      await dynamoDbClient.delete(params).promise();
      res.json({...Item, msg: 'User was deleted'});
    } else {
      res
        .status(404)
        .json({error: 'Could not find user with provided "userId" or has already been deleted'});
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({error: "The user could not be retrieved "});
  }
});


app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports = {
  handler: serverless(app)
};
