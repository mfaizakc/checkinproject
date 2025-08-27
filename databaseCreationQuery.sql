DROP TABLE IF EXISTS CheckinEvents;
DROP TABLE IF EXISTS Staff;

-- Staff table
CREATE TABLE Staff (
    NRIC NVARCHAR(10) PRIMARY KEY,
    Fullname NVARCHAR(100) NOT NULL,
	Department NVARCHAR(50) NOT NULL
);

-- CheckinEvents table with foreign key to Staff.NRIC
CREATE TABLE CheckinEvents (
    Id INT IDENTITY PRIMARY KEY,
    NRIC NVARCHAR(10) NOT NULL,        -- must match Staff.NRIC
    UUID NVARCHAR(50) NULL,            -- optional, for traceability
    Timestamp DATETIME DEFAULT GETDATE(),
    Latitude FLOAT NULL,
    Longitude FLOAT NULL,
    Location NVARCHAR(50) NULL,        -- e.g. '64Hillview'

    CONSTRAINT FK_CheckinEvents_Staff FOREIGN KEY (NRIC)
        REFERENCES Staff(NRIC)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);