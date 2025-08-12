CREATE TABLE CheckinEvents (
    Id INT IDENTITY PRIMARY KEY,
    UserId NVARCHAR(100),
    Token NVARCHAR(100),
    Timestamp DATETIME DEFAULT GETDATE(),
    Type NVARCHAR(50),
    Status NVARCHAR(20) DEFAULT 'active',
    Latitude FLOAT NULL,
    Longitude FLOAT NULL
);
