import { subscriptionResolvers } from "./subscription-resolver.js";
import { commentResolvers } from "./comment-resolver.js";
import { authResolvers } from "./auth-resolver.js";
import { taskResolvers } from "./task-resolver.js";
import { userResolvers } from "./user-resolver.js";

const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...userResolvers.Query,
    ...taskResolvers.Query,
    ...commentResolvers.Query,
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...commentResolvers.Mutation,
  },

  Subscription: {
    ...subscriptionResolvers.Subscription,
  },

  User: {
    ...userResolvers.User,
  },

  Task: {
    ...taskResolvers.Task,
  },

  Comment: {
    ...commentResolvers.Comment,
  },
};

export default resolvers;
