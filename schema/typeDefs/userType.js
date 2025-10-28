export const userTypeDefs = `
    type User {
        id: ID!
        name: String!
        email: String!
        created_at: DateTime!

        # Relational Fields
        createdTasks: [Task!]!
        assignedTasks: [Task]!
        comments: [Comment!]!
    }

    type AuthData {
        token: String!
        user: User!
    }

    input registerInput {
        name: String!
        email: String!
        password: String!
    }

    input updateUserProfileInput {
        name: String
        email: String
    }

    input changePasswordInput {
        oldPassword: String!
        newPassword: String!
    }

    extend type Mutation {
        register(input: registerInput!): AuthData!
        login(email: String!, password: String!): AuthData!
        updateUserProfile(input: updateUserProfileInput!): User!
        changePassword(input: changePasswordInput): FormatResponses!
        deleteUser(id: ID!): FormatResponses!
    }

    extend type Query {
        me: User!
        getUser(id: ID!): User
        getAllUsers(pagination: PaginationInput): [User!]!
        searchUsers(name: String!, pagination: PaginationInput): [User!]!
    }
`;
