#Add token based auth to your previous backend. 

Create in your database a "user" collection with username and password, using the right tool to hash passwords.

Create a service test with two endpoints:

    - Register (username, password): creates a new valid user
    - Login: returns a token for access API
    - Enable Authorization on the other endpoints making them available only to registered users


[EXTRA]

Implement refresh token technique
