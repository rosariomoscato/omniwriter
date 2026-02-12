const line = "                  if (pagination.totalPages <= 5) {";
console.log("Line:", line);
console.log("Has ):", line.includes(")"));
console.log("Position of ):", line.indexOf(")"));
console.log("Position of {:", line.indexOf("{"));
console.log("Has ) before {:", line.indexOf(")") < line.indexOf("{"));
