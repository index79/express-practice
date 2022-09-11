const BookInstance = require('../models/bookinstance');
const { body, validationResult} = require('express-validator');
const Book = require('../models/book');
const async = require("async");

// BookInstances 리스트 표시
exports.bookinstance_list = function(req, res, next) {

  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful.
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances, user: req.user});
    });

};

// BookInstance 의 디테일한 정보 표시.
exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) { // No results.
        const err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
      // Successful.
      res.render('bookinstance_detail', {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,
        user: req.user
      });
    });
};

// BookInstance 객체 생성 on GET.
exports.bookinstance_create_get = (req, res, next) => {
  Book.find({}, "title").exec((err, books) => {
    if (err) {
      return next(err);
    }
    // Successful
    res.render("bookinstance_form", {
      title: "책 객체 생성",
      book_list: books,
      user: req.user
    });
  });
};

// BookInstance 생성 on POST
exports.bookinstance_create_post = [
  // 입력정보 확인.
  body("book", "알림: 책이름이 넣으세요.").trim().isLength({ min: 1}).escape(),
  body("imprint", "알림: 날인 정보를 넣으세요.")
    .trim()
    .isLength({ min: 1})
    .escape(),
  body("status").escape(),
  body("due_back", "알림: 날짜 형식이 잘못되었습니다.")
    .optional({checkFalsy: true})
    .isISO8601()
    .toDate(),

  // 입력정보 확인 후 진행.
  (req, res, next) => {
    // 에러 확인.
    const errors = validationResult(req);

    // BookInstance 객체 생성
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if(!errors.isEmpty()) {
      // 에러가 확인 되었으면 원래 폼으로 redirect.
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful.
        res.render("bookinstance_form", {
          title: "책 객체 생성",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance,
          user: req.user
        })
      });
      return;
    }

    // 입력 정보가 valid 함으로 디비에 저장.
    bookinstance.save((err) => {
      if (err) {
        return next(err);
      }
      // Successful.
      res.redirect(bookinstance.url);
    });
  }
];

// BookInstance 객체 삭제 on GET req.
exports.bookinstance_delete_get = function(req, res, next) {

  BookInstance.findById(req.params.id)
  .populate('book')
  .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          res.redirect('/catalog/bookinstances');
      }
      // Successful.
      res.render('bookinstance_delete', { title: '책객체', bookinstance:  bookinstance, user: req.user
    });
  })
};

// BookInstance 객체 삭제 on POST
exports.bookinstance_delete_post = function(req, res, next) {
    
  // BookInstance id 가 valid  한다는 가정하에
  BookInstance.findByIdAndRemove(req.body.id, function deleteBookInstance(err) {
      if (err) { return next(err); }
      // Success.
      res.redirect('/catalog/bookinstances');
      });
};

// BookInstance 업데이트 폼 표시 on GET.
exports.bookinstance_update_get = function(req, res, next) {

  // 책, 작가, 장르 기존정보 디비에서 가져오기
  async.parallel({
      bookinstance: function(callback) {
          BookInstance.findById(req.params.id).populate('book').exec(callback)
      },
      books: function(callback) {
          Book.find(callback)
      },

      }, function(err, results) {
          if (err) { return next(err); }
          if (results.bookinstance==null) { // No results.
              var err = new Error('Book copy not found');
              err.status = 404;
              return next(err);
          }
          // Success.
          res.render('bookinstance_form', { 
            title: 'Update  BookInstance', 
            book_list : results.books, 
            selected_book : results.bookinstance.book._id, 
            bookinstance:results.bookinstance,
            user: req.user
          });
      });

};

// BookInstance 업데이트 on POST.
exports.bookinstance_update_post = [

  // 입력정보 확인
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601().toDate(),
  
  
  // 입력 정보 확인 후 진행.
  (req, res, next) => {

      // 에러 확인.
      const errors = validationResult(req);

      // 현재의 id로 BookInstance 객체 생성
      var bookinstance = new BookInstance(
        { book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back,
          _id: req.params.id
         });

      if (!errors.isEmpty()) {
          // 에러가 확인되면,
          Book.find({},'title')
              .exec(function (err, books) {
                  if (err) { return next(err); }
                  // Successful.
                  res.render('bookinstance_form', { title: 'Update BookInstance', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance, user: req.user
                });
          });
          return;
      }
      else {
          // 입력데이터가 valid 하면.
          BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,thebookinstance) {
              if (err) { return next(err); }
                 // Successful.
                 res.redirect(thebookinstance.url);
              });
      }
  }
];

