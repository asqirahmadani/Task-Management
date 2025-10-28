export const commentTypeDefs = `
    type Comment {
        id: ID!
        task_id: ID!
        user_id: ID!
        text: String!
        created_at: DateTime!

        # Relational fields
        task: Task!
        user: User!
    }

    input createCommentData {
        task_id: ID!
        text: String!
    }

    input updateCommentData {
        text: String!
    }

    extend type Mutation {
        createComment(input: createCommentData!): Comment!
        updateComment(id: ID!, input: updateCommentData!): Comment!
        deleteComment(id: ID!): FormatResponses!
    }

    extend type Query {
        getAllComments(pagination: PaginationInput): [Comment!]!
        getComment(id: ID!): Comment
        getCommentsByTask(taskId: ID!, pagination: PaginationInput): [Comment!]!
        getCommentsByUser(userId: ID!, pagination: PaginationInput): [Comment!]!
    }
`;
