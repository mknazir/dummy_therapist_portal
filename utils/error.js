export const errorHandler=(statsuCode,message)=>{
   console.log("error handler");
   const error=new Error();
   error.status=statsuCode
   error.message=message
   return error;
}
