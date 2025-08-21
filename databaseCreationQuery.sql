DROP TABLE IF EXISTS CheckinEvents;

CREATE TABLE CheckinEvents (
    Id INT IDENTITY PRIMARY KEY,
    NRIC NVARCHAR(20) NOT NULL,         -- s=... value from sub
    UUID NVARCHAR(50) NULL,             -- u=... value from sub (optional, for traceability)
    Timestamp DATETIME DEFAULT GETDATE(),
    Latitude FLOAT NULL,
    Longitude FLOAT NULL
);
