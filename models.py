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
    applied = db.Column(db.Integer, nullable=True)
    hidden = db.Column(db.Integer, nullable=True)
    titleRanking = db.Column(db.Float, nullable=True)
    liked = db.Column(db.Integer, nullable=True)
    interview = db.Column(db.Integer, nullable=True)
    rejected = db.Column(db.Integer, nullable=True)
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
