CREATE SCHEMA IF NOT EXISTS freeledger;

CREATE TYPE authmethod AS ENUM ('email', 'metamask');
CREATE TYPE userrole AS ENUM ('client', 'freelancer', 'admin');
CREATE TYPE contractstatus AS ENUM ('active', 'funded', 'completed', 'cancelled', 'disputed');
CREATE TYPE milestonestatus AS ENUM ('pending', 'in_review', 'approved', 'rejected');
CREATE TYPE disputestatus AS ENUM ('open', 'resolved');
CREATE TYPE disputedecision AS ENUM ('buyer', 'seller', 'split', 'none');
CREATE TYPE experiencelevel AS ENUM ('entry', 'mid', 'senior');
