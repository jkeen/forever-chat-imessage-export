module.exports =  function getRowCount(db, countQuery) {
  this.rowCount = 0;
  let promise = new Promise((resolve) => {
    db.serialize(() => {
      db.all(countQuery, (error, row) => {
        resolve(row[0]['count']);
      });
    });
  });

  return promise;
};
