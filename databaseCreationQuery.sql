DROP TABLE IF EXISTS CheckinEvents;

CREATE TABLE CheckinEvents (
    Id INT IDENTITY PRIMARY KEY,
    NRIC NVARCHAR(20) NOT NULL,         -- s=... value from sub
    UUID NVARCHAR(50) NULL,             -- u=... value from sub (optional, for traceability)
    Timestamp DATETIME DEFAULT GETDATE(),
    Status NVARCHAR(20) DEFAULT 'active',
    Latitude FLOAT NULL,
    Longitude FLOAT NULL
);
