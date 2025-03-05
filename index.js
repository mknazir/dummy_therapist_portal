const env = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { connectToDatabase, getDb } = require("./db/db.js");
//router
const authRouter = require('./route/auth.route.js');
const userRouter = require('./route/user.route.js');
const appointmentRouter = require('./route/appointment.route.js');
const therapistRouter = require('./route/therapist.route.js');
const paymentRouter = require('./route/payment.route.js');
const groupSessationRouter = require('./route/groupSessation.route.js');
const apiHandlersRouter = require("./route/apiHandlers.route.js");
const referalRouter = require("./route/referal.route.js");
const { app , server } = require("./socket.js");

env.config();

// const corsOptions = {
//   origin: "*",
//   // credentials: true,
// };


const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions)); // Make sure this is placed early
app.options('*', cors(corsOptions)); // Preflight handler for all routes
//middleware
app.use(cookieParser());

app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

//routes
app.use('/api',authRouter)
app.use('/api',userRouter)
app.use('/api',appointmentRouter)
app.use('/api',therapistRouter)
app.use('/api',paymentRouter)
app.use('/api',groupSessationRouter)
app.use('/api',apiHandlersRouter)
app.use('/api',referalRouter)


const PORT = +process.env.PORT || 8000;
connectToDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
