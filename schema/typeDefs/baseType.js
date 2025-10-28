export const baseTypeDefs = `
type Query {
  _empty: String
}

type Mutation {
  _empty: String
}

input PaginationInput {
  page: Int = 1
  limit: Int = 10
}

type FormatResponses {
  success: Boolean!
  message: String!
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

scalar DateTime

`;
