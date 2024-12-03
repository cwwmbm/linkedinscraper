from app import db, config

class Job(db.Model):
    __tablename__ = config['jobs_tablename']

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, nullable=False)
    company = db.Column(db.Text, nullable=True)
    location = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, nullable=True)
    job_url = db.Column(db.Text, nullable=True)
    job_description = db.Column(db.Text, nullable=True)
    applied = db.Column(db.Integer, nullable=True, default=0)
    hidden = db.Column(db.Integer, nullable=True, default=0)
    titleRanking = db.Column(db.Float, nullable=True, default=None)
    liked = db.Column(db.Integer, nullable=True, default=None)
    interview = db.Column(db.Integer, nullable=True, default=0)
    rejected = db.Column(db.Integer, nullable=True, default=0)
    date_loaded = db.Column(db.Text, nullable=True)
    cover_letter = db.Column(db.Text, nullable=True, default=None)
    resume = db.Column(db.Text, nullable=True, default=None)

    def __repr__(self):
        return (
            f"<Job(id={self.id}, title='{self.title}', company='{self.company}', "
            f"location='{self.location}', date='{self.date}')>"
        )

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class FilteredJob(db.Model):
    __tablename__ = config['filtered_jobs_tablename']

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, nullable=False)
    company = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, nullable=True)
    job_url = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return (
            f"<Job(id={self.id}, title='{self.title}', company='{self.company}', "
            f"date='{self.date}')>"
        )

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
