import { commentTypeDefs } from "./commentType.js";
import { baseTypeDefs } from "./baseType.js";
import { taskTypeDefs } from "./taskType.js";
import { userTypeDefs } from "./userType.js";

const typeDefs = [baseTypeDefs, userTypeDefs, taskTypeDefs, commentTypeDefs];

export default typeDefs;
